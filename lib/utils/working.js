var Q = require('q');
var immutable = require('immutable');

var error = require('./error');
var WorkingState = require('../models/workingState');
var CacheUtils = require('./cache');

var CHANGES = require('../constants/changeType');

// Returns a Seq of tree mixing changes and the fetched tree
// @param {WorkingState}
// @return {Set<Path>}
function getMergedFileSet(workingState) {
    // Original file list
    var treeFileList = immutable.Set.fromKeys(workingState.getTreeEntries());

    // List changes
    var changes = workingState.getChanges();
    var setToRemove = immutable.Set.fromKeys(
        changes.filter(function isRemove(change) {
            return change.getType() === CHANGES.REMOVE;
        })
    );
    var setToAdd = immutable.Set.fromKeys(
        changes.filter(function isPresent(change) {
            return change.getType() === CHANGES.UPDATE
                || change.getType() === CHANGES.CREATE;
        })
    );

    return treeFileList.subtract(setToRemove).union(setToAdd);
}


// Returns true if the file differs from initial tree (including removed)
// @return {Boolean}
// @throws FILE_NOT_FOUND
function hasPendingChanges(workingState, filepath) {
    // Lookup potential changes
    var change = workingState.getChanges().get(filepath);
    if(change) {
        return true;
    } else {
        // Else lookup tree
        var treeEntry = workingState.getTreeEntries().get(filepath);
        if(!treeEntry) {
            throw error.fileNotFound(filepath);
        } else {
            return false;
        }
    }
}

// Attempts to find a SHA if available for the  given file
// @param {Path}
// @return {SHA | Null} null if Sha cannot be retrieved (because of pending change)
// @throws NOT_FOUND if the file does not exist or was removed
function findSha(workingState, filepath) {
    // Lookup potential changes
    var change = workingState.getChanges().get(filepath);
    // Else lookup tree
    var treeEntry = workingState.getTreeEntries().get(filepath);

    if (change) {
        if(change.getType() == CHANGES.REMOVE) {
            throw error.fileNotFound(filepath);
        } else {
            return change.getSha();
        }
    } else if (treeEntry) {
        return treeEntry.getSha();
    } else {
        throw error.fileNotFound(filepath);
    }
}

// Fetch tree for a branch and return an clean WorkingState for it
function fetchTree(driver, branch) {
    // Fetch the tree
    return driver.fetchTree(branch)
    .then(function(tree) {
        return WorkingState.createFromTree(tree);
    });
}

// Fetch a file into a ContentState
function fetchFile(workingState, driver, file) {
    var blobSha = file.getSha();
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
    getMergedFileSet: getMergedFileSet,
    fetchTree: fetchTree,
    fetchFile: fetchFile,
    hasPendingChanges: hasPendingChanges,
    findSha: findSha
};
