const Immutable = require('immutable');

const CHANGE_TYPE = require('../constants/changeType');
const RepoUtils = require('./repo');
const pathUtils = require('./path');

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
    let workingState = repoState.getCurrentState();
    let changes = workingState.getChanges();
    const type = change.getType();

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
    let workingState = repoState.getCurrentState();

    // Create empty list of changes
    const changes = new Immutable.OrderedMap();

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
    let workingState = repoState.getCurrentState();

    // Remove file from changes map
    const changes = workingState.getChanges().delete(filePath);

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
    let workingState = repoState.getCurrentState();
    let changes = workingState.getChanges();

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
    let workingState = repoState.getCurrentState();
    const changes = workingState.getChanges().filter(
        // Remove all changes that are in the directory
        function(change) {
            return change.getType() === CHANGE_TYPE.REMOVE;
        }
    );

    // Update workingState and repoState
    workingState = workingState.set('changes', changes);
    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

const ChangeUtils = {
    getChange,
    setChange,
    revertAll,
    revertForFile,
    revertForDir,
    revertAllRemoved
};
module.exports = ChangeUtils;
