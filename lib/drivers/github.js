var _ = require('lodash');
var Q = require('q');
var Immutable = require('immutable');
var axios = require('axios');
var urlJoin = require('urljoin.js');

var util = require('util');
var gravatar = require('../utils/gravatar');
var base64 = require('../utils/base64');
var Driver = require('./driver');
var ERRORS = require('../constants/errors');

var Blob = require('../models/blob');
var Branch = require('../models/branch');
var Commit = require('../models/commit');
var Author = require('../models/author');
var TreeEntry = require('../models/treeEntry');
var WorkingState = require('../models/workingState');

/**
 * Options for the GitHub Driver
 */
var GitHubOptions = Immutable.Record({
    // String: ID of the GitHub repository (ex: me/myrepo")
    repository: null,

    // API endpoint
    host: 'https://api.github.com',

    // Endpoint for RAW content
    rawhost: 'https://raw.githubusercontent.com',

    // Authentication for the API
    username: null,
    token: null,

    // Include auth token in raw url?
    includeTokenInRaw: false
}, 'GitHubOptions');


// Driver for GitHub APIs and uHub
function GitHubDriver(options) {
    Driver.call(this);

    this.options = new GitHubOptions(options);

}
util.inherits(GitHubDriver, Driver);

// ---- Fetching ----

GitHubDriver.prototype.fetchBlob = function(sha) {
    return this.get('git/blobs/' + sha)
    .then(function(r) {
        return Blob.createFromBase64(r.content);
    });
};

// https://developer.github.com/v3/git/trees/
GitHubDriver.prototype.fetchWorkingState = function(ref) {
    return this.get('git/trees/'+ref, {
        recursive: 1
    })
    .then(function(tree) {
        // TODO filter out entries of type 'tree'
        var treeEntries = new Immutable.Map().withMutations(
            function addEntries(map) {
                _.map(tree.tree, function (entry) {
                    var treeEntry = new TreeEntry({
                        sha: entry.sha,
                        blobSize: entry.size,
                        mode: entry.mode
                    });
                    map.set(entry.path, treeEntry);
                });
            }
        );
        return WorkingState.createWithTree(tree.sha, treeEntries);
    });
};

GitHubDriver.prototype.fetchBranches = function() {
    return this.get('branches')
    .then(function(branches) {
        branches = _.map(branches, function(branch) {
            // TODO properly detect remote
            return new Branch({
                name: branch.name,
                sha: branch.commit.sha,
                // branch.is_local is undefined for GitHub
                remote: branch.is_local === false ? 'origin' : ''
            });
        });

        return new Immutable.List(branches);
    });
};

// ------ Flushing -----

GitHubDriver.prototype.flushCommit = function(commitBuilder) {
    var that = this;

    // Create blobs required
    var blobPromises = commitBuilder.getBlobs().map(function(blob, filePath) {
        return that.post('git/blobs', {
            content: blob.getAsBase64(),
            encoding: 'base64'
        })
        .then(function (ghBlob) {
            return [filePath, ghBlob.sha];
        });
    });

    // Wait for all request to finish
    return Q.all(blobPromises.toArray())
    .then(function(result) {
        // Recrgeate an object map from the list of [path, sha]
        return _.fromPairs(result);
    })
    // Create new tree
    .then(function(blobSHAs) {
        var entries = commitBuilder.getTreeEntries().map(function(treeEntry, filePath) {
            return {
                path: filePath,
                mode: treeEntry.getMode(),
                type: 'blob',
                sha: blobSHAs[filePath] || treeEntry.getSha()
            };
        }).toArray();
        return that.post('git/trees', {
            tree: entries
        });
    })

    // Create the new commit
    .then(function(ghTree) {
        var committer = commitBuilder.getCommitter();
        var author = commitBuilder.getAuthor();
        var payload = {
            committer: {
                name: committer.getName(),
                email: committer.getEmail()
            },
            author: {
                name: author.getName(),
                email: author.getEmail()
            },
            message: commitBuilder.getMessage(),
            parents: commitBuilder.getParents().toArray(),
            tree: ghTree.sha
        };
        return that.post('git/commits', payload);
    })
    .then(normCreatedCommit);
};

// https://developer.github.com/v3/repos/commits/#list-commits-on-a-repository
GitHubDriver.prototype.listCommits = function(opts) {
    opts = opts || {};
    var apiOpts = {
        sha: opts.ref,
        path: opts.path,
        author: opts.author,
        per_page: opts.per_page
    };

    return this.get('commits', apiOpts)
    .then(function(commits) {
        return new Immutable.List(commits).map(normListedCommit);
    });
};

// https://developer.github.com/v3/repos/commits/#get-a-single-commit
GitHubDriver.prototype.fetchCommit = function (sha) {
    return this.get('commits/'+sha)
    .then(normListedCommit);
};

// https://developer.github.com/v3/repos/commits/#compare-two-commits
GitHubDriver.prototype.findParentCommit = function(ref1, ref2) {
    return this.get('compare/' + ref1 + '...' + ref2)
    .then(function (res) {
        var commit = res.merge_base_commit;
        if (!commit || !commit.sha) {
            return null;
        } else {
            return normListedCommit(commit);
        }
    });
};

// https://developer.github.com/v3/repos/commits/#compare-two-commits
GitHubDriver.prototype.fetchOwnCommits = function(base, head) {
    var refs = [base, head].map(function (x) {
        return (x instanceof Branch) ? x.getFullName() : x;
    });

    return this.get('compare/' + refs[0] + '...' + refs[1])
    .then(function (res) {
        return new Immutable.List(res.commits).map(normListedCommit);
    });
};

GitHubDriver.prototype.createRef = function(ref, sha) {
    return this.post('git/refs', {
        'ref': 'refs/heads/'+ref,
        'sha': sha
    });
};

GitHubDriver.prototype.forwardBranch = function(branch, sha) {
    return this.patch('git/refs/heads/'+branch.getFullName(), {
        sha: sha
    })
    // Normalize cannot fast forward errors
    .fail(normNotFF);
};

GitHubDriver.prototype.createBranch = function(base, name) {
    return this.createRef(name, base.getSha())
    .thenResolve(new Branch({
        name: name,
        sha: base.getSha()
    }));
};

GitHubDriver.prototype.deleteBranch = function(branch) {
    return this.delete('git/refs/heads/'+branch.getName());
};

// https://developer.github.com/v3/repos/merging/
GitHubDriver.prototype.merge = function(from, into, options) {
    var opts = options;
    var head = from instanceof Branch ? from.getFullName() : from;
    return this.post('merges', {
        base: into.getFullName(),
        head: head,
        commit_message: opts.message
    })
    .then(function (ghCommit) {
        if (!ghCommit) {
            // No commit was needed
            return null;
        }
        // The format the same as in commit listing, without files
        ghCommit.files = [];
        return normListedCommit(ghCommit);
    })
    // Normalize merge conflict errors
    .fail(normConflict);
};

// ---- Remotes ----

GitHubDriver.prototype.listRemotes = function () {
    return this.get('remotes');
};

GitHubDriver.prototype.editRemotes = function (name, url) {
    return this.post('remotes', {
        name: name,
        url: url
    });
};

GitHubDriver.prototype.pull = function (opts) {
    opts = _.defaults({}, opts, {
        force: false
    });
    // Convert to ref
    opts.branch = opts.branch.getName();

    return this.post('pull', opts)
    .fail(normNotFF)
    .fail(normAuth)
    .fail(normUnknownRemote);
};

GitHubDriver.prototype.push = function (opts) {
    opts = _.defaults({}, opts, {
        force: false
    });
    // Convert to ref
    opts.branch = opts.branch.getName();

    return this.post('push', opts)
    .fail(normNotFF)
    .fail(normAuth)
    .fail(normUnknownRemote);
};


// API utilities

/**
 * Execute an GitHub HTTP API request
 * @param {String} httpMethod 'get', 'post', etc.
 * @param {String} method name of the method
 * @param {Object} args Req. parameters for get, or json data for others
 */
GitHubDriver.prototype.request = function(httpMethod, method, args) {
    var axiosOpts = {
        method: httpMethod,
        url: urlJoin(
            this.options.get('host'),
            '/repos/'+this.options.get('repository') + '/' + method
        )+'?t='+Date.now(),
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Content-type': 'application/json;charset=UTF-8'
        }
    };

    var username = this.options.get('username');
    var token = this.options.get('token');

    if (username && token) {
        axiosOpts.headers['Authorization'] = 'Basic ' + base64.encode(username + ':' + token);
    } else if (token) {
        axiosOpts.headers['Authorization'] = 'Token ' + token;
    }

    if (httpMethod == 'get') axiosOpts.params = args;
    else axiosOpts.data = args;

    // console.log('API', httpMethod.toUpperCase(), method);
    return Q(axios(axiosOpts))
    .get('data')
    .fail(function(response) {
        if (response instanceof Error) throw response;

        var e = new Error(response.data.message || 'Error '+response.status+': '+response.data);
        e.statusCode = response.status;

        throw e;
    });
};

function normNotFF(err) {
    var msg = err.message;
    if(/fast forward/.test(msg)) {
        err.code = ERRORS.NOT_FAST_FORWARD;
    }
    return Q.reject(err);
}

function normConflict(err) {
    var msg = err.message;
    if (/merge conflict/i.test(msg)) {
        err.code = ERRORS.CONFLICT;
    }
    return Q.reject(err);
}

function normAuth(err) {
    var msg = err.message;
    if (/Failed to authenticate/.test(msg)
        || /401/.test(msg)
        || /auth schemes/.test(msg)) {
        err.code = ERRORS.AUTHENTICATION_FAILED;
    }

    return Q.reject(err);
}

function normUnknownRemote(err) {
    var msg = err.message;
    if (/specify a URL/.test(msg)
        || /specify a remote/.test(msg)) {
        err.code = ERRORS.UNKNOWN_REMOTE;
    }

    return Q.reject(err);
}


/**
 * Normalize a commit coming from the GitHub commit creation API
 * @param {JSON} ghCommit
 * @return {Commit}
 */
function normCreatedCommit(ghCommit) {
    var commit = Commit.create({
        sha: ghCommit.sha,
        message: ghCommit.message,
        author: getSimpleAuthor(ghCommit.author),
        date: ghCommit.author.date,
        parents: ghCommit.parents.map(function getSha(o) { return o.sha; })
    });

    return commit;
}

/**
 * Normalize a commit coming from the GitHub commit listing API
 * @param {JSON} ghCommit
 * @return {Commit}
 */
function normListedCommit(ghCommit) {
    var commit = Commit.create({
        sha: ghCommit.sha,
        message: ghCommit.commit.message,
        author: getCompleteAuthor(ghCommit),
        date: ghCommit.commit.author.date,
        files: ghCommit.files,
        parents: ghCommit.parents.map(function getSha(o) { return o.sha; })
    });

    return commit;
}

// Get author from created commit (no avatar)
function getSimpleAuthor(author) {
    return Author.create(
        author.name,
        author.email,
        new Date(author.date)
    );
}

// Get author from a listed commit (with avatar)
function getCompleteAuthor(commit) {
    var author = getSimpleAuthor(commit.commit.author);
    var avatar = commit.author?
            commit.author.avatar_url
            : gravatar.url(author.getEmail());
    return author.set('avatar', avatar);
}

// Shortcuts for API requests
GitHubDriver.prototype.get = _.partial(GitHubDriver.prototype.request, 'get');
GitHubDriver.prototype.post = _.partial(GitHubDriver.prototype.request, 'post');
GitHubDriver.prototype.patch = _.partial(GitHubDriver.prototype.request, 'patch');
GitHubDriver.prototype.delete = _.partial(GitHubDriver.prototype.request, 'delete');
GitHubDriver.prototype.put = _.partial(GitHubDriver.prototype.request, 'put');

module.exports = GitHubDriver;
