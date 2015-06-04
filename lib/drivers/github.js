var _ = require('lodash');
var Q = require('q');
var path = require('path');
var base64 = require('js-base64').Base64;
var axios = require('axios');

var types = require('../types');
var errors = require('../errors');

function Driver(options) {
    this.options = _.defaults(options || {}, {
        repository: null,
        host: "https://api.github.com",
        username: null,
        token: null

    });
    if (!this.options.repository) throw "GitHub driver requires a 'repository' option";
}

// Map some file informations
Driver.prototype.mapFile = function(infos) {
    return {
        "name": infos.name,
        "path": infos.path,
        "content": infos.content? base64.decode(infos.content.replace(/(\r\n|\n|\r)/gm,"")) : undefined,
        "sha": infos.sha,
        "type": infos.type
    };
}

// Execute an HTTP API request
Driver.prototype.api = function (httpMethod, method, args, options) {
    var that = this;
    var opts = {
        method: httpMethod,
        url: this.options.host+"/repos/"+this.options.repository+"/"+method+"?t="+Date.now(),
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
    .then(this.mapFile.bind(this));
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
                return [file.name, that.mapFile(file)];
            })
            .object()
            .value();
    });
};

// Read a file
Driver.prototype.read = function(p, opts) {
    return this.stat(p, opts).get('content');
};

// Write a file
Driver.prototype.write = function(p, content, opts) {
    var encodedContent, that = this;
    opts = _.defaults(opts || {}, {
        base64: false
    });

    encodedContent = opts.base64? content : base64.encode(content);

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
        result.content = encodedContent;
        return that.mapFile(result);
    });
};

// Create a new file
Driver.prototype.create = function(p, content, opts) {
    var encodedContent, that = this;
    opts = _.defaults(opts || {}, {
        base64: false
    });

    encodedContent = opts.base64? content : base64.encode(content);

    return this.stat(p, { ref: opts.ref })
    .then(function() {
        throw "File '"+p+"' already exists";
    }, function() {
        return that.api("put", "contents/"+p, {
            message: opts.message,
            branch: opts.ref,
            content: encodedContent,
            commiter: that.options.commiter
        });
    })
    .then(function(result) {
        result.content = encodedContent;
        return that.mapFile(result);
    });
};

// Delete a file
Driver.prototype.unlink = function(p, opts) {
    var that = this;

    return that.stat(p, { ref: opts.ref })
    .then(function(infos) {
        return that.api('delete', 'contents'+path.join('/', p), {
            sha: infos.sha,
            ref: opts.ref
        });
    });
};

module.exports = Driver;

