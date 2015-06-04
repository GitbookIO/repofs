var _ = require('lodash');
var Q = require('q');
var path = require('path');
var base64 = require('js-base64').Base64;
var axios = require('axios');

function mapFile(infos) {
    return {
        "name": infos.name,
        "path": infos.path,
        "content": infos.content? base64.decode(infos.content.replace(/(\r\n|\n|\r)/gm,"")) : undefined,
        "sha": infos.sha,
        "type": infos.type
    };
}

function Driver(options) {
    this.options = _.defaults(options || {}, {
        repository: null,
        host: "https://api.github.com",
        username: null,
        token: null

    });
    if (!this.options.repository) throw "GitHub driver requires a 'repository' option";
}

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
    .then(mapFile);
};

// Read a file
Driver.prototype.read = function(p, opts) {
    return this.stat(p, opts).get('content');
};

// Write a file
Driver.prototype.write = function(p, content, opts) {
    throw "not implemented";
};

module.exports = Driver;

