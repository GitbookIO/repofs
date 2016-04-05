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
var Commit = require('../models/commit');
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
        var treeEntries = new immutable.Map().withMutations(
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
                remote: branch.is_local? '' : 'origin'
            });
        });

        return new immutable.List(branches);
    });
};

// ------ Flushing -----

GitHubDriver.prototype.flushCommit = function(commit) {
    var that = this;
    var blobSHAs = {};

    return Q()

    // Create blobs required
    .then(function() {
        return commit.blobs.reduce(function(prev, blob, filePath) {
            return prev
            .then(function() {
                return that.post('git/blobs', {
                    content: blob.getAsBase64(),
                    encoding: 'base64'
                });
            })
            .then(function(ghBlob) {
                blobSHAs[filePath] = ghBlob.sha;
            });
        }, Q());
    })

    // Create new tree
    .then(function() {
        var entries = commit.treeEntries.map(function(treeEntry, filePath) {
            return {
                path: filePath,
                mode: treeEntry.getMode(),
                type: 'blob',
                sha: blobSHAs[filePath] || treeEntry.getSha()
            };
        });

        return that.post('git/trees', {
            tree: entries.toJS()
        });
    })

    // Create the new commit
    .then(function(ghTree) {
        return that.post('git/commits', {
            committer: commit.committer.toJS(),
            author: commit.author.toJS(),
            message: commit.getMessage(),
            parents: commit.getParents(),
            tree: ghTree.sha
        });
    })

    .then(function(ghCommit) {
        return Commit.decode({
            sha: ghCommit.sha,
            message: ghCommit.message,
            parents: ghCommit.parents
        });
    });
};

GitHubDriver.prototype.flushRef = function(ref, sha) {
    return this.patch('patch', 'git/refs/'+ref, {
        sha: sha
    });
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

// Shortcuts for API requests
GitHubDriver.prototype.get = _.partial(GitHubDriver.prototype.request, 'get');
GitHubDriver.prototype.post = _.partial(GitHubDriver.prototype.request, 'post');
GitHubDriver.prototype.del = _.partial(GitHubDriver.prototype.request, 'delete');
GitHubDriver.prototype.put = _.partial(GitHubDriver.prototype.request, 'put');

module.exports = GitHubDriver;
