var Q = require('q');

var WorkingState = require('../models/workingState');
var TreeEntry = require('../models/treeEntry');
var CacheUtils = require('./cache');

var CHANGES = require('../constants/changeType');

// Returns a tree mixing changes and the fetched tree
function getWorkingTree(workingState) {
    var tree = workingState.getTree();
    var changes = workingState.getChanges();

    return changes.reduce(function(workingTree, change, changePath) {
        var type = change.getType();

        // Remove entry from tree
        if (type == CHANGES.REMOVE) {
            return workingTree.delete(changePath);
        }

        // Update/Add new entry
        else if (type == CHANGES.UPDATE || type == CHANGES.CREATE) {
            var entry = new TreeEntry({
                size: change.getContent().length,
                sha: null
            });

            return workingTree.set(changePath, entry);
        } else {
            throw new Error('Invalid type of change: '+type);
        }

    }, tree);
}

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
        var newCache = CacheUtils.addBlob(cache, blob);
        return workingState.set('cache', newCache);
    });
}

module.exports = {
    getWorkingTree: getWorkingTree,
    fetchTree: fetchTree,
    fetchFile: fetchFile
};
