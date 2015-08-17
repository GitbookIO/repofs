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

// Get author from commit
function getAuthor(commit) {
    return  {
        "name": commit.commit.author.name,
        "email": commit.commit.author.email,
        "avatar": commit.author? commit.author.avatar_url : undefined
    };
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

// Map some file informations
Driver.prototype.mapFile = function(ref, infos) {
    var rawUrl = infos.download_url || urlJoin(this.options.rawhost, this.options.repository+'/'+ref+'/'+infos.path);
    if (this.options.includeTokenInRaw) rawUrl = rawUrl+'?token='+encodeURIComponent(base64.encode(this.options.username + ':' + this.options.token));

    return {
        "name": infos.name,
        "path": infos.path,
        "content": _.isString(infos.content)? arrayBuffer.fromBase64(infos.content.replace(/(\r\n|\n|\r)/gm,"")) : undefined,
        "sha": infos.sha,
        "type": infos.type,
        "size": infos.size,
        "url": rawUrl
    };
}

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


// Get informations about a file
Driver.prototype.stat = function(p, opts) {
    return this.api('get', 'contents'+path.join('/', p), {
        ref: opts.ref
    })
    .then(_.bind(this.mapFile, this, opts.ref));
};

// List files in a directory
Driver.prototype.readdir = function(p, opts) {
    var that = this;

    return this.api('get', 'contents'+path.join('/', p), {
        ref: opts.ref
    })
    .then(function(files) {
        return _.chain(files)
            .map(function(file) {
                return [file.name, that.mapFile(opts.ref, file)];
            })
            .object()
            .value();
    });
};

// Write a file
Driver.prototype.write = function(p, content, opts) {
    var encodedContent, that = this;

    encodedContent = arrayBuffer.enforceBase64(content);

    return that.stat(p, { ref: opts.ref })
    .then(function(infos) {
        return that.api("put", "contents/"+p, {
            branch: opts.ref,
            message: opts.message,
            content: encodedContent,
            sha: infos.sha,
            committer: that.options.commiter
        });
    })
    .then(function(result) {
        result.content.content = encodedContent;
        return that.mapFile(opts.ref, result.content);
    });
};

// Create a new file
Driver.prototype.create = function(p, content, opts) {
    var encodedContent, that = this;

    encodedContent = arrayBuffer.enforceBase64(content);

    return this.stat(p, { ref: opts.ref })
    .then(function() {
        throw errors.fileAlreadyExist(p);
    }, function() {
        return that.api("put", "contents/"+p, {
            message: opts.message,
            branch: opts.ref,
            content: encodedContent,
            commiter: that.options.commiter
        });
    })
    .then(function(result) {
        result.content.content = encodedContent;
        return that.mapFile(opts.ref, result.content);
    });
};

// Delete a file
Driver.prototype.unlink = function(p, opts) {
    var that = this;

    return that.stat(p, { ref: opts.ref })
    .then(function(infos) {
        return that.api('delete', 'contents'+path.join('/', p), {
            message: opts.message,
            sha: infos.sha,
            branch: opts.ref,
            commiter: that.options.commiter
        });
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
                commit: branch.commit.sha
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
// todo: handle pagination and opts.start/opts.limit
Driver.prototype.listCommits = function(opts) {
    var that = this;

    return this.api("get", "commits", { sha: opts.ref })
    .then(function(commits) {
        return _.map(commits, function(commit) {
            return {
                "sha": commit.sha,
                "author": getAuthor(commit),
                "message": commit.commit.message,
                "date": commit.commit.author.date
            };
        });
    });
};

// Get a single commit
Driver.prototype.getCommit = function(sha) {
    var that = this;

    return this.api("get", "commits/"+sha)
    .then(function(commit) {
        return {
            "sha": commit.sha,
            "author": getAuthor(commit),
            "message": commit.commit.message,
            "date": commit.commit.author.date,
            "files": _.map(commit.files, function(file) {
                return {
                    filename: file.filename,
                    patch: file.patch
                };
            })
        };
    });
};

// Push to a rmote
Driver.prototype.push = function(opts) {
    return this.api("post", "push", opts);
};

Driver.id = "github";
module.exports = Driver;

