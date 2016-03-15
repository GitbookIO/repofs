var Q = require('q');
var WorkingUtils = require('./working');

// Change workinState for a specific branch
function updateWorkingState(repoState, branch, workingState) {
    var workingStates = repoState.getWorkingStates();

    // Update the entry in the map
    workingStates = workingStates.set(branch, workingState);

    return repoState.set('workingStates', workingStates);
}

// Change current working tree
function updateCurrentWorkingState(repoState, workingState) {
    return updateWorkingState(repoState, repoState.getCurrentBranch(), workingState);
}

// Change current branch in the repository
function checkoutBranch(repoState, driver, branch) {
    return Q()

    // Fetch branch if doesnt exist
    .then(function() {
        var workingStates = repoState.getWorkingStates();
        var workingState = workingStates.get(branch);

        // We refresh only if no working tree or has no changes
        if (workingState && workingState.isClean()) return;

        // Create new workingState
        workingState = WorkingUtils.createEmpty();

        // Fetch tree for this branch
        return WorkingUtils.fetchTree(workingState, branch)
        .then(function(newWorkingState) {
            repoState = updateWorkingState(repoState, branch, newWorkingState);
        });
    })

    // Set current branch
    .then(function() {
        return repoState.set('currentBranch', branch);
    });
}

// List branches in the repository
function listBranches(repoState, driver) {
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
