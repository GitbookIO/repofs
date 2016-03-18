var _ = require('lodash');
var Q = require('q');
var immutable = require('immutable');
var axios = require('axios');
var urlJoin = require('urljoin.js');

var util = require('util');
var base64 = require('../utils/base64');
var Driver = require('./driver');

var Blob = require('../models/blob');
var Branch = require('../models/branch');
var WorkingState = require('../models/workingState');

// Options for the GitHub Driver
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



function GitHubDriver(options) {
    Driver.call(this);

    this.options = new GitHubOptions(options);

}
util.inherits(GitHubDriver, Driver);

// ---- Implemented methods ----

GitHubDriver.prototype.fetchBlob = function(sha) {
    return this.get('git/blobs/' + sha)
    .then(function(r) {
        return Blob.createFromBase64(r.content);
    });
};

GitHubDriver.prototype.fetchWorkingState = function(ref) {
    return this.get('git/trees/'+ref, {
        recursive: 1
    })
    .then(function(tree) {
        return WorkingState.decode({
            head: tree.sha,
            treeEntries: _.values(tree.entries)
        });
    });
};

GitHubDriver.prototype.fetchBranches = function() {
    return this.get('branches')
    .then(function(branches) {
        branches = _.map(branches, function(branch) {
            return new Branch({
                name: branch.name,
                sha: branch.commit.sha,
                remote: branch.is_local? 'origin' : null
            });
        });

        return new immutable.List(branches);
    });
};

// API utilities

// Execute an GitHub HTTP API request
// @param {String} httpMethod 'get', 'post', etc.
// @param {String} method name of the method
// @param {Object} args Req. parameters for get, or json data for others
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

// Shortcuts for API requests
GitHubDriver.prototype.get = _.partial(GitHubDriver.prototype.request, 'get');
GitHubDriver.prototype.post = _.partial(GitHubDriver.prototype.request, 'post');
GitHubDriver.prototype.del = _.partial(GitHubDriver.prototype.request, 'delete');
GitHubDriver.prototype.put = _.partial(GitHubDriver.prototype.request, 'put');

module.exports = GitHubDriver;
