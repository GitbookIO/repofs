var Q = require('q');
var immutable = require('immutable');

var error = require('./error');
var CacheUtils = require('./cache');
var TreeEntry = require('../models/treeEntry');
var CHANGES = require('../constants/changeType');

/**
 * Returns a Seq of tree mixing changes and the fetched tree
 * @param {WorkingState}
 * @return {Set<Path>}
 */
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

/**
 * Returns a Map of TreeEntry, with sha null when the content is not available as sha.
 * The size of the TreeEntries
 * @param {WorkingState}
 * @return {Map<TreeEntries>}
 */
function getMergedTreeEntries(workingState) {
    var removedOrModified = workingState.getChanges().groupBy(function(change, path) {
        if(change.getType() === CHANGES.REMOVE) {
            return 'remove';
        } else {
            // Must be UDPATE or CREATE
            return 'modified';
        }
    });

    var setToRemove = immutable.Set.fromKeys(removedOrModified.get('remove', []));

    var withoutRemoved = workingState.getTreeEntries().filter(function (treeEntry, path) {
        return !setToRemove.contains(path);
    });

    var addedTreeEntries = removedOrModified.get('modified', []).map(
        function toTreeEntry(change) {
            return new TreeEntry({
                sha: change.hasSha() ? change.getSha() : null,
                mode: '100644'
            });
        }
    );

    return withoutRemoved.concat(addedTreeEntries);
}

/**
 * Returns true if the file differs from initial tree (including removed)
 * @return {Boolean}
 * @throws FILE_NOT_FOUND
 */
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

/**
 * Attempts to find a SHA if available for the  given file
 * @param {Path}
 * @return {SHA | Null} null if Sha cannot be retrieved (because of pending change)
 * @throws NOT_FOUND if the file does not exist or was removed
 */
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

/**
 * Fetch tree for a branch and return an clean WorkingState for it
 */
function fetch(driver, branch) {
    // Fetch the tree
    return driver.fetchWorkingState(branch);
}

/**
 * Fetch a file into a ContentState
 */
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
    getMergedTreeEntries: getMergedTreeEntries,
    fetch: fetch,
    fetchFile: fetchFile,
    hasPendingChanges: hasPendingChanges,
    findSha: findSha
};
