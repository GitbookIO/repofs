var _ = require('lodash');
var Q = require('q');
var axios = require('axios');
var urlJoin = require('urljoin.js');

var util = require('util');
var base64 = require('../utils/base64');
var Driver = require('./driver');

function GitHubDriver() {
    Driver.apply(this, arguments);
}
util.inherits(GitHubDriver, Driver);

// ---- Implemented methods ----

GitHubDriver.prototype.fetchBlob = function(sha) {};

GitHubDriver.prototype.fetchTree = function(branch) {};

GitHubDriver.prototype.fetchBranches = function() {};

// Utility

// Execute an GitHub HTTP API request
// @param {String} httpMethod 'get', 'post', etc.
// @param {String} method name of the method
// @param {Object} args Req. parameters for get, or json data for others
// @param {ApiOption} options Options for the api request
var DEFAULT_API_OPTIONS = {
    host: new String(),
    repository: new String(),
    username: undefined, // String
    token: undefined // String
};

function api(httpMethod, method, args, options) {
    options = _.defaults({}, options || {}, DEFAULT_API_OPTIONS);

    var axiosOpts = {
        method: httpMethod,
        url: urlJoin(options.host, '/repos/'+options.repository+'/'+method)+'?t='+Date.now(),
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Content-type': 'application/json;charset=UTF-8'
        }
    };

    if (options.username && options.token) {
        axiosOpts.headers['Authorization'] = 'Basic ' + base64.encode(options.username + ':' + options.token);
    } else if (options.token) {
        axiosOpts.headers['Authorization'] = 'Token ' + options.token;
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
}

module.exports = GitHubDriver;
