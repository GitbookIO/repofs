var immutable = require('immutable');

var CHANGE_TYPE = require('../constants/changeType');
var RepoUtils = require('./repo');
var pathUtils = require('./path');

/**
 * Set a new change to the current WorkingState
 * @param {RepositoryState}
 * @param {String}
 * @param {Change}
 */
function setChange(repoState, filepath, change) {
    var workingState = repoState.getCurrentState();
    // Push changes to list
    var changes = workingState.getChanges().set(filepath, change);
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
    var changes = new immutable.OrderedMap();

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
    setChange: setChange,
    revertAll: revertAll,
    revertForFile: revertForFile,
    revertForDir: revertForDir,
    revertAllRemoved: revertAllRemoved
};
module.exports = ChangeUtils;
