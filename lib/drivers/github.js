var _ = require('lodash');
var Q = require('q');
var path = require('path');
var axios = require('axios');
var url = require('url');
var urlJoin = require('urljoin.js');

var types = require('../types');
var errors = require('../errors');
var base64 = require('../utils/base64');
var arrayBuffer = require('../utils/arraybuffer');

// 1MB max size to return
var CONTENT_MAX_SIZE = 1*1024*1024;

// Get author from commit
function getAuthor(commit) {
    return  {
        "name": commit.commit.author.name,
        "email": commit.commit.author.email,
        "avatar": commit.author? commit.author.avatar_url : undefined
    };
}

// Normalize a patch
function normPatch(file) {
    return {
        filename: file.filename,
        patch: file.patch
    };
}

// Normalize a commit
function normCommit(commit) {
    var r = {
        "sha": commit.sha,
        "author": getAuthor(commit),
        "message": commit.commit.message,
        "date": commit.commit.author.date
    };
    if (commit.files) {
        r.files = _.map(commit.files, normPatch);
    }
    return r;
}


function Driver(options) {
    this.options = _.defaults({}, options || {}, {
        repository: null,
        host: "https://api.github.com",
        rawhost: "https://raw.githubusercontent.com",
        username: null,
        token: null,
        includeTokenInRaw: false

    });
    if (!this.options.repository) throw "GitHub driver requires a 'repository' option";
}

// Return a raw url for a file
Driver.prototype.rawUrl = function(branch, file) {
    return this.options.rawhost
        .replace(':repo', this.options.repository)
        .replace(':branch', branch)
        .replace(':file', file);
};

// Execute an HTTP API request
Driver.prototype.api = function (httpMethod, method, args, options) {
    var that = this;
    var opts = {
        method: httpMethod,
        url: urlJoin(this.options.host, "/repos/"+this.options.repository+"/"+method)+"?t="+Date.now(),
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Content-type': 'application/json;charset=UTF-8'
        }
    };

    if (this.options.username) {
        opts.headers['Authorization'] = 'Basic ' + base64.encode(this.options.username + ':' + this.options.token);
    }

    if (httpMethod == 'get') opts.params = args;
    else opts.data = args;

    return Q(axios(opts))
    .get('data')
    .fail(function(response) {
        if (response instanceof Error) throw response;

        var e = new Error(response.data.message || "Error "+response.status+": "+response.data);
        e.statusCode = response.status;

        throw e;
    });
};

// Fetch all tree
Driver.prototype.fetchTree = function(ref) {
    return this.api('get', 'git/trees/'+ref, {
        recursive: 1
    })
    .then(function(r) {
        return {
            sha: ref,
            entries: _.chain(r.tree)
                .map(function(entry) {
                    return [
                        entry.path,
                        {
                            sha: entry.sha,
                            path: entry.path,
                            size: entry.size
                        }
                    ];
                })
                .object()
                .value()
        };
    });
};

// Fetch content of a blob
Driver.prototype.fetchBlob = function(ref) {
    return this.api('get', 'git/blobs/'+ref)
    .then(function(r) {
        return {
            size: r.size,
            content: ((_.isString(r.content) && r.size < CONTENT_MAX_SIZE)? arrayBuffer.fromBase64(r.content.replace(/(\r\n|\n|\r)/gm,"")) : undefined)
        };
    });
};

// List branches
Driver.prototype.listBranches = function(p, opts) {
    var that = this;

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

// Create a branch
Driver.prototype.createBranch = function(name, from) {
    var that = this;

    return this.api("get", "branches/"+from)
    .then(function(branch) {
        return that.api("post", "git/refs", {
            "ref": "refs/heads/"+name,
            "sha": branch.commit.sha
        });
    });
};

// Remove a branch
Driver.prototype.removeBranch = function(name) {
    return this.api("delete", "git/refs/heads/"+name);
};

// Merge branches
Driver.prototype.mergeBranches = function(from, to, opts) {
    var that = this;

    return this.api("post", "merges", {
        base: to,
        head: from,
        commit_message: opts.message
    });
};

// List commits
// https://developer.github.com/v3/repos/commits/#list-commits-on-a-repository
// todo: handle pagination and opts.start/opts.limit
Driver.prototype.listCommits = function(opts) {
    var that = this;

    return this.api("get", "commits", { sha: opts.ref })
    .then(function(commits) {
        return _.map(commits, normCommit);
    });
};

// Get a single commit
// https://developer.github.com/v3/repos/commits/#get-a-single-commit
Driver.prototype.getCommit = function(sha) {
    var that = this;

    return this.api("get", "commits/"+sha)
    .then(normCommit);
};

// Compare two commits
// https://developer.github.com/v3/repos/commits/#compare-two-commits
Driver.prototype.compareCommits = function(base, head, opts) {
    return this.api("get", "compare/"+[base, head].join('...'))
    .then(function(r) {
        return {
            "status": r.status,
            "ahead_by": r.ahead_by,
            "behind_by": r.behind_by,
            "total_commits": r.total_commits,
            "base": normCommit(r.base_commit),
            "head": normCommit(r.merge_base_commit),
            "commits": _.map(r.commits, normCommit),
            "files": _.map(r.files, normPatch)
        };
    });
};

// List remotes
// Not supported on api.github.com
Driver.prototype.listRemotes = function(opts) {
    return this.api("get", "remotes", opts);
};

// Edit a remote
// Not supported on api.github.com
Driver.prototype.editRemote = function(opts) {
    return this.api("post", "remotes", opts);
};

// Checkout a branch
// Not supported on api.github.com
Driver.prototype.checkout = function(opts) {
    return this.api("post", "checkout", opts);
};

// Fetch a remote
// Not supported on api.github.com
Driver.prototype.fetch = function(opts) {
    return this.api("post", "fetch", opts);
};

// Push to a remote
// Not supported on api.github.com
Driver.prototype.push = function(opts) {
    return this.api("post", "push", opts);
};

// Pull from a remote
// Not supported on api.github.com
Driver.prototype.pull = function(opts) {
    return this.api("post", "pull", opts);
};

Driver.id = "github";
module.exports = Driver;

