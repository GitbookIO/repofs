var Q = require('q');
var WorkingUtils = require('./working');

// Change workinState for a specific branch
// @param {RepositoryState}
// @param {Branch}
// @param {WorkingState}
// @return {RepositoryState}
function updateWorkingState(repoState, branch, workingState) {
    var workingStates = repoState.getWorkingStates();

    // Update the entry in the map
    workingStates = workingStates.set(branch.getName(), workingState);

    return repoState.set('workingStates', workingStates);
}

// Change current working tree
function updateCurrentWorkingState(repoState, workingState) {
    return updateWorkingState(repoState, repoState.getCurrentBranch(), workingState);
}

// Fetches the given branch and **resets any WorkingState for it**
// @param {RepositoryState}
// @param {Driver}
// @param {Branch}
// @return {Promise(RepositoryState)}
function fetchBranch(repoState, driver, branch) {
    return Q()
    .then(function() {
        // Fetch a working tree for this branch
        return WorkingUtils.fetchTreeAndCreate(driver, branch)
        .then(function(newWorkingState) {
            repoState = updateWorkingState(repoState, branch, newWorkingState);
        });
    });
}

// Change current branch in the repository (sync). Requires to have
// fetched the branch.
// @param {RepositoryState}
// @param {Branch}
// @return {RepositoryState}
function checkoutBranch(repoState, branch) {
    if(!repoState.isFetched(branch)) {
        throw Error('Branch '+branch.getName()+' must be fetched first');
    }
    return repoState.set('currentBranchName', branch.getName());
}

// List branches in the repository
function fetchBranches(repoState, driver) {
    return driver.fetchBranches()
    .then(function(branches) {
        return repoState.set('branches', branches);
    });
}

module.exports = {
    checkout: checkoutBranch,
    listBranches: listBranches,
    updateWorkingState: updateWorkingState,
    updateCurrentWorkingState: updateCurrentWorkingState
};
