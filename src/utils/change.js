var Immutable = require('immutable');

var CHANGE_TYPE = require('../constants/changeType');
var RepoUtils = require('./repo');
var pathUtils = require('./path');

/**
 * Returns the pending change of a file on the current branch
 * @param {RepositoryState} state
 * @param {Path} filepath
 * @return {Change | Null} Null if no change, or the file does not exist
 */
function getChange(state, filepath) {
    return state.getCurrentState().getChanges().get(filepath)
        || null;
}

/**
 * Set a new change to the current WorkingState.
 * Attempt to resolve some cases like removing a file that was added
 * in the first place.
 * @param {RepositoryState}
 * @param {String}
 * @param {Change}
 */
function setChange(repoState, filepath, change) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();
    var type = change.getType();

    // Simplify change when possible
    if (type === CHANGE_TYPE.REMOVE
        && !workingState.getTreeEntries().has(filepath)) {
        // Removing a file that did not exist before
        changes = changes.delete(filepath);

    } else if (type === CHANGE_TYPE.CREATE
               && workingState.getTreeEntries().has(filepath)) {
        // Adding back a file that existed already
        changes = changes.set(filepath, change.set('type', CHANGE_TYPE.UPDATE));

    } else {
        // Push changes to list
        changes = changes.set(filepath, change);
    }

    // Update workingState and repoState
    workingState = workingState.set('changes', changes);
    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

/**
 * Revert all changes
 * @param {RepositoryState}
 * @return {RepositoryState}
 */
function revertAll(repoState) {
    var workingState = repoState.getCurrentState();

    // Create empty list of changes
    var changes = new Immutable.OrderedMap();

    // Update workingState and repoState
    workingState = workingState.set('changes', changes);
    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

/**
 * Revert change for a specific file
 * @param {RepositoryState}
 * @param {Path}
 * @return {RepositoryState}
 */
function revertForFile(repoState, filePath) {
    var workingState = repoState.getCurrentState();

    // Remove file from changes map
    var changes = workingState.getChanges().delete(filePath);

    // Update workingState and repoState
    workingState = workingState.set('changes', changes);
    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

/**
 * Revert changes for a specific directory
 * @param {RepositoryState}
 * @param {Path}
 * @return {RepositoryState}
 */
function revertForDir(repoState, dirPath) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();

    // Remove all changes that are in the directory
    changes = changes.filter(function(change, filePath) {
        return !pathUtils.contains(dirPath, filePath);
    });

    // Update workingState and repoState
    workingState = workingState.set('changes', changes);
    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

/**
 * Revert all removed files
 * @param {RepositoryState}
 * @return {RepositoryState}
 */
function revertAllRemoved(repoState) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges().filter(
        // Remove all changes that are in the directory
        function(change) {
            return change.getType() === CHANGE_TYPE.REMOVE;
        }
    );

    // Update workingState and repoState
    workingState = workingState.set('changes', changes);
    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

var ChangeUtils = {
    getChange: getChange,
    setChange: setChange,
    revertAll: revertAll,
    revertForFile: revertForFile,
    revertForDir: revertForDir,
    revertAllRemoved: revertAllRemoved
};
module.exports = ChangeUtils;
