var RepoUtils = require('./repo');

// Set a new change to the current WorkingState
// @param {RepositoryState}
// @param {String}
// @param {Change}
function setChange(repoState, filepath, change) {
    var workingState = repoState.getCurrentState();
    // Push changes to list
    var changes = workingState.getChanges().set(filepath, change);
    // Update workingState and repoState
    workingState = workingState.set('changes', changes);
    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

// @param {Change}
// @param {Path}
// @return {String}
function defaultMessage(change, filepath) {
    throw new Error('TODO Not implemented');
}

module.exports = {
    setChange: setChange,
    defaultMessage: defaultMessage
};
