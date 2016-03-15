var Q = require('q');

var WorkingState = require('../models/workingState');
var Cache = require('../models/cache');

// Fetch tree for a ContentState
function fetchTree(workingState, driver, ref) {
    // Fetch the tree
    return driver.fetchTree(ref)
    .then(function(tree) {
        return WorkingState.createFromTree(tree);
    });
}

// Fetch a file into a ContentState
function fetchFile(workingState, driver, file) {
    var blobSha = file.getSHA();
    var cache = workingState.getCache();
    var blob = cache.getBlob(blobSha);

    // Already present in the cache?
    if (!blob) return Q(workingState);

    // Fetch the blob
    return driver.fetchBlob(blobSha)

    // Then store it in the cache
    .then(function(blob) {
        var newCache = Cache.addBlob(cache, blob);
        return workingState.set('cache', newCache);
    });
}

module.exports = {
    fetchTree: fetchTree,
    fetchFile: fetchFile
};
