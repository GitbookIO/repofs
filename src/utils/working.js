const Immutable = require('immutable');

const error = require('./error');
const TreeEntry = require('../models/treeEntry');
const CHANGES = require('../constants/changeType');

/**
 * Returns a Seq of tree mixing changes and the fetched tree
 * @param {WorkingState}
 * @return {Set<Path>}
 */
function getMergedFileSet(workingState) {
    return Immutable.Set.fromKeys(
        getMergedTreeEntries(workingState).filter(
            treeEntry => treeEntry.getType() === TreeEntry.TYPES.BLOB
        )
    );
}

/**
 * Returns a Map of TreeEntry, with sha null when the content is not available as sha.
 * @param {WorkingState}
 * @return {Map<TreeEntries>}
 */
function getMergedTreeEntries(workingState) {
    const removedOrModified = workingState.getChanges().groupBy((change, path) => {
        if (change.getType() === CHANGES.REMOVE) {
            return 'remove';
        } else {
            // Must be UDPATE or CREATE
            return 'modified';
        }
    });

    const setToRemove = Immutable.Set.fromKeys(removedOrModified.get('remove', []));

    const withoutRemoved = workingState.getTreeEntries().filter((treeEntry, path) => {
        return !setToRemove.contains(path);
    });

    const addedTreeEntries = removedOrModified.get('modified', []).map(
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
// TODO unused, remove
function hasPendingChanges(workingState, filepath) {
    // Lookup potential changes
    const change = workingState.getChanges().get(filepath);
    if (change) {
        return true;
    } else {
        // Else lookup tree
        const treeEntry = workingState.getTreeEntries().get(filepath);
        if (!treeEntry) {
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
    const change = workingState.getChanges().get(filepath);
    // Else lookup tree
    const treeEntry = workingState.getTreeEntries().get(filepath);

    if (change) {
        if (change.getType() == CHANGES.REMOVE) {
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

const WorkingUtils = {
    getMergedFileSet,
    getMergedTreeEntries,
    fetch,
    hasPendingChanges, // TODO remove, unused
    findSha
};
module.exports = WorkingUtils;
