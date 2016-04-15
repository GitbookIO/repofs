var _ = require('lodash');
var Q = require('q');
var immutable = require('immutable');
var axios = require('axios');
var urlJoin = require('urljoin.js');

var util = require('util');
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
var GitHubOptions = immutable.Record({
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
});


// Driver for GitHub APIs and alike
function GitHubDriver(options) {
    Driver.call(this);

    this.options = new GitHubOptions(options);

}
util.inherits(GitHubDriver, Driver);

// ---- Fetching ----

GitHubDriver.prototype.fetchBlob = function(sha) {
    return this.get('git/blobs/' + sha)
    .then(function(r) {
        // TODO handle size
        return Blob.createFromBase64(r.content);
    });
};

GitHubDriver.prototype.fetchWorkingState = function(ref) {
    return this.get('git/trees/'+ref, {
        recursive: 1
    })
    .then(function(tree) {
        // TODO filter out entries of type 'tree'
        var treeEntries = new immutable.Map().withMutations(
            function addEntries(map) {
                _.map(tree.tree, function (entry) {
                    var treeEntry = new TreeEntry({
                        sha: entry.sha,
                        byteLength: entry.size,
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

        return new immutable.List(branches);
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
        // Recreate an object map from the list of [path, sha]
        return _.zipObject(result);
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

/**
 * Additional options:
 * @param {Path} [options.path] Filter containing the file
 * @param {String} [options.author] Filter by author
 * @param {Number} [options.per_page] Limite number of result
 */
GitHubDriver.prototype.listCommits = function(opts) {
    opts = opts || {};
    var apiOpts = {
        sha: opts.ref,
        path: opts.path,
        author: opts.author,
        per_page: opts.limit
    };

    return this.get('commits', apiOpts)
    .then(function(commits) {
        return _.map(commits, normListedCommit);
    });
};

GitHubDriver.prototype.findParentCommit = function(ref1, ref2) {
    return this.get('compare/' + ref1 + '...' + ref2)
    .then(function (res) {
        var commit = res.merge_base_commit;
        return normListedCommit(commit);
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
    .fail(normError);
};

Driver.prototype.createBranch = function(base, name) {
    return this.createRef(name, base.getSha())
    .thenResolve(new Branch({
        name: name,
        sha: base.getSha()
    }));
};

Driver.prototype.deleteBranch = function(branch) {
    return this.api('delete', 'git/refs/heads/'+branch.getName());
};

Driver.prototype.merge = function(from, into, options) {
    var opts = options;
    var head = from instanceof Branch ? from.getFullName() : from;
    return this.post('merges', {
        base: into.getFullName(),
        head: head,
        commit_message: opts.message
    })
    // Normalize merge conflict errors
    .fail(normError);
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

// Normalize errors, see normError for promises
function normalizeError(err) {
    // Can not fast forward
    if(/fast forward/.test(err.message)) {
        err.code = ERRORS.NOT_FAST_FORWARD;
    } else if (/merge conflict/i.test(err.message)) {
        err.code = ERRORS.CONFLICT;
    }
    return err;
}

// Normalize errors, promise friendly
function normError(err) {
    return Q.reject(normalizeError(err));
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
    return author.set('avatar',
                      commit.author? commit.author.avatar_url : undefined);
}

// Shortcuts for API requests
GitHubDriver.prototype.get = _.partial(GitHubDriver.prototype.request, 'get');
GitHubDriver.prototype.post = _.partial(GitHubDriver.prototype.request, 'post');
GitHubDriver.prototype.patch = _.partial(GitHubDriver.prototype.request, 'patch');
GitHubDriver.prototype.del = _.partial(GitHubDriver.prototype.request, 'delete');
GitHubDriver.prototype.put = _.partial(GitHubDriver.prototype.request, 'put');

module.exports = GitHubDriver;
