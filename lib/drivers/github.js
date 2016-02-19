var _ = require('lodash');
var Q = require('q');
var axios = require('axios');
var urlJoin = require('urljoin.js');

var errors = require('../errors');
var base64 = require('../utils/base64');
var arrayBuffer = require('../utils/arraybuffer');

// 1MB max size to return
var CONTENT_MAX_SIZE = 1*1024*1024;

// Get author from commit
function getAuthor(commit) {
    return  {
        'name': commit.commit.author.name,
        'email': commit.commit.author.email,
        'avatar': commit.author? commit.author.avatar_url : undefined
    };
}

// Normalize a commit
function normCommit(commit) {
    return {
        'sha': commit.sha,
        'author': getAuthor(commit),
        'message': commit.commit.message,
        'date': commit.commit.author.date,
        files: commit.files
    };
}


// Normalize errors, see normError for promises
function normalizeError(err) {
    // Can not fast forward
    if(/fast forward/.test(err.message)) {
        err.code = errors.CODE.NOT_FAST_FORWARD;
    } else if (/merge conflict/i.test(err.message)) {
        err.code = errors.CODE.CONFLICT;
    }
    return err;
}

// Normalize errors, promise friendly
function normError(err) {
    return Q.reject(normalizeError(err));
}

function Driver(options, fs) {
    this.fs = fs;
    this.options = _.defaults({}, options || {}, {
        repository: null,
        host: 'https://api.github.com',
        rawhost: 'https://raw.githubusercontent.com',
        username: null,
        token: null,
        includeTokenInRaw: false
    });
    if (!this.options.repository) throw new Error('GitHub driver requires a "repository" option');
}

// Return a raw url for a file
Driver.prototype.rawUrl = function(file) {
    return this.options.rawhost
        .replace(':repo', this.options.repository)
        .replace(':branch', this.fs.getCurrentBranch())
        .replace(':file', file);
};

// Execute an HTTP API request
Driver.prototype.api = function (httpMethod, method, args, options) {
    var opts = {
        method: httpMethod,
        url: urlJoin(this.options.host, '/repos/'+this.options.repository+'/'+method)+'?t='+Date.now(),
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Content-type': 'application/json;charset=UTF-8'
        }
    };

    if (this.options.username && this.options.token) {
        opts.headers['Authorization'] = 'Basic ' + base64.encode(this.options.username + ':' + this.options.token);
    } else if (this.options.token) {
        opts.headers['Authorization'] = 'Token ' + this.options.token;
    }

    if (httpMethod == 'get') opts.params = args;
    else opts.data = args;

    // console.log('API', httpMethod.toUpperCase(), method);
    return Q(axios(opts))
    .get('data')
    .fail(function(response) {
        if (response instanceof Error) throw response;

        var e = new Error(response.data.message || 'Error '+response.status+': '+response.data);
        e.statusCode = response.status;

        throw e;
    });
};

// Fetch the whole tree for the given ref. Unlike Github, filters out tree entries
// https://developer.github.com/v3/git/trees/
Driver.prototype.fetchTree = function(ref) {
    return this.api('get', 'git/trees/'+ref, {
        recursive: 1
    })
    .then(function(r) {
        var entries = {};

        _.each(r.tree, function (entry) {
            if (entry.type === 'tree') return;
            entries[entry.path] = {
                sha: entry.sha,
                path: entry.path,
                size: entry.size,
                mode: entry.mode,
                type: entry.type
            };
        });

        return {
            sha: r.sha,
            entries: entries
        };
    });
};

// Fetch content of a blob
Driver.prototype.fetchBlob = function(sha) {
    return this.api('get', 'git/blobs/'+sha)
    .then(function(r) {
        return {
            size: r.size,
            content: ((_.isString(r.content) && r.size < CONTENT_MAX_SIZE)? arrayBuffer.fromBase64(r.content.replace(/(\r\n|\n|\r)/gm,'')) : undefined)
        };
    });
};

// Commit pending changes.
// commit : {
//     message: String
//     parents: [ Refs | SHA ],
//     tree: [ Blob ]
// }
Driver.prototype.commit = function(commit) {
    var that = this;
    var newTree;

    return Q()
    .then(function() {
        newTree = {
            tree: _.values(commit.tree)
        };

        // Create new blobs
        return _.reduce(newTree.tree, function(prev, entry) {
            // Entry didn't changed
            if (entry.sha) return prev;

            return prev.then(function() {
                return that.api('post', 'git/blobs', {
                    content: entry.buffer,
                    encoding: 'base64'
                })
                .then(function(blob) {
                    delete entry.buffer;
                    entry.type = 'blob';
                    entry.sha = blob.sha;
                    entry.mode = entry.mode || '100644';
                });
            });
        }, Q());
    })

    // Create new tree
    .then(function() {
        return that.api('post', 'git/trees', newTree);
    })

    // Finally, create the new commit
    .then(function(tree) {
        return that.api('post', 'git/commits', {
            committer: that.fs.options.committer,
            author: that.fs.options.committer,
            message: commit.message,
            parents: commit.parents,
            tree: tree.sha
        });
    });
};

// Updates the ref's value
// Can fail with `CODE.NOT_FAST_FORWARD`
Driver.prototype.updateRef = function(ref, sha) {
    return this.api('patch', 'git/refs/heads/'+ref,
                    { sha: sha })
    .fail(normError);
};

// List branches
Driver.prototype.listBranches = function() {
    return this.api('get', 'branches')
    .then(function(branches) {
        return _.map(branches, function(branch) {
            return {
                name: branch.name,
                commit: branch.commit.sha,
                is_local: branch.is_local
            };
        });
    });
};

// Fetch ref infos (type and sha)
Driver.prototype.getRef = function(ref) {
    return this.api('get', 'git/refs/heads/'+ref)
    .then(function(r) {
        return {
            ref: r.ref,
            object: _.pick(r.object, 'type', 'sha')
        };
    });
};

// Create a branch
Driver.prototype.createBranch = function(name, from) {
    var that = this;

    return this.api('get', 'branches/'+from)
    .then(function(branch) {
        return that.api('post', 'git/refs', {
            'ref': 'refs/heads/'+name,
            'sha': branch.commit.sha
        });
    });
};

// Remove a branch
Driver.prototype.removeBranch = function(name) {
    return this.api('delete', 'git/refs/heads/'+name);
};

// Attempts a simple branch merging
// Can fail with `CODE.CONFLICT`
Driver.prototype.mergeBranches = function(from, to, opts) {
    opts = _.defaults(opts || {}, {
        message: undefined
    });

    return this.api('post', 'merges', {
        base: to,
        head: from,
        commit_message: opts.message
    })
    .fail(normError);
};

// List commits
// https://developer.github.com/v3/repos/commits/#list-commits-on-a-repository
// todo: handle pagination and opts.start/opts.limit
Driver.prototype.listCommits = function(opts) {
    var apiOpts = {
        sha: opts.ref,
        path: opts.path,
        author: opts.author,
        per_page: opts.limit
    };

    return this.api('get', 'commits', apiOpts)
    .then(function(commits) {
        return _.map(commits, normCommit);
    });
};

// Get a single commit
// https://developer.github.com/v3/repos/commits/#get-a-single-commit
Driver.prototype.getCommit = function(sha) {
    return this.api('get', 'commits/'+sha)
    .then(normCommit);
};

// Compare two commits
// https://developer.github.com/v3/repos/commits/#compare-two-commits
Driver.prototype.compareCommits = function(base, head, opts) {
    return this.api('get', 'compare/'+[base, head].join('...'))
    .then(function(r) {
        return {
            'status': r.status,
            'ahead_by': r.ahead_by,
            'behind_by': r.behind_by,
            'total_commits': r.total_commits,
            'base': normCommit(r.base_commit),
            'head': normCommit(r.merge_base_commit),
            'commits': _.map(r.commits, normCommit),
            'files':r.files
        };
    });
};

// List remotes
// Not supported on api.github.com
Driver.prototype.listRemotes = function(opts) {
    return this.api('get', 'remotes', opts);
};

// Edit a remote
// Not supported on api.github.com
Driver.prototype.editRemote = function(opts) {
    return this.api('post', 'remotes', opts);
};

// Checkout a branch
// Not supported on api.github.com
Driver.prototype.checkout = function(branch, opts) {
    var that = this;

    return Q()
    .then(function() {
        if (branch.is_local === undefined) return;
        return that.api('post', 'checkout', {
            branch: branch.name,
            remote: opts.remote
        });
    });
};

// Fetch a remote
// Not supported on api.github.com
Driver.prototype.fetch = function(opts) {
    return this.api('post', 'fetch', opts);
};

// Push to a remote
// Not supported on api.github.com
Driver.prototype.push = function(opts) {
    return this.api('post', 'push', opts);
};

// Pull from a remote
// Not supported on api.github.com
Driver.prototype.pull = function(opts) {
    return this.api('post', 'pull', opts);
};

Driver.id = 'github';
module.exports = Driver;
