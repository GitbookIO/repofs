var immutable = require('immutable');

var error = require('./error');
var TreeEntry = require('../models/treeEntry');
var CHANGES = require('../constants/changeType');

/**
 * Returns a Seq of tree mixing changes and the fetched tree
 * @param {WorkingState}
 * @return {Set<Path>}
 */
function getMergedFileSet(workingState) {
    return immutable.Set.fromKeys(getMergedTreeEntries(workingState));
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
 * @return {Sha | Null} null if Sha cannot be retrieved (because of pending change)
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
 * Fetch tree for a branch (using its SHA) and return an clean WorkingState for it
 * @param {Driver} driver
 * @param {Branch} branch
 */
function fetch(driver, branch) {
    // Fetch the tree
    return driver.fetchWorkingState(branch.getSha());
}

var WorkingUtils = {
    getMergedFileSet: getMergedFileSet,
    getMergedTreeEntries: getMergedTreeEntries,
    fetch: fetch,
    hasPendingChanges: hasPendingChanges,
    findSha: findSha
};
module.exports = WorkingUtils;
