var Branch = require('../models/branch');
var WorkingUtils = require('./working');
var RepositoryState = require('../models/repositoryState');

/**
 * Change workinState for a specific branch
 * @param {RepositoryState} repoState
 * @param {Branch} branch
 * @param {WorkingState | Null} newWorkingState Pass null to delete
 * @return {RepositoryState}
 */
function updateWorkingState(repoState, branch, newWorkingState) {
    var workingStates = repoState.getWorkingStates();

    var key = branch.getFullName();
    if(newWorkingState === null) {
        // Delete
        workingStates = workingStates.delete(key);
    } else {
        // Update the entry in the map
        workingStates = workingStates.set(key, newWorkingState);
    }

    return repoState.set('workingStates', workingStates);
}

/**
 * Change current working tree
 */
function updateCurrentWorkingState(repoState, workingState) {
    return updateWorkingState(repoState, repoState.getCurrentBranch(), workingState);
}

/**
 * Fetches the given branch's tree, from its SHA, and __resets any
 * WorkingState for it__
 * @param {RepositoryState}
 * @param {Driver}
 * @param {Branch}
 * @return {Promise<RepositoryState>}
 */
function fetchTree(repoState, driver, branch) {
    // Fetch a working tree for this branch
    return WorkingUtils.fetch(driver, branch)
    .then(function(newWorkingState) {
        return updateWorkingState(repoState, branch, newWorkingState);
    });
}

/**
 * Change current branch in the repository (sync). Requires to have
 * fetched the branch.
 * @param {RepositoryState} repoState
 * @param {Branch | String} branch Can provide the fullname of the branch instead
 * @return {RepositoryState}
 */
function checkout(repoState, branch) {
    var _branch = branch;
    if (!(branch instanceof Branch)) {
        _branch = repoState.getBranch(branch);
        if (branch === null) {
            throw Error('Unknown branch '+branch);
        }
    }

    if(!repoState.isFetched(_branch)) {
        throw Error('Tree for branch '+_branch.getFullName()+' must be fetched first');
    }
    return repoState.set('currentBranchName', _branch.getFullName());
}

/**
 * Fetch the list of branches in the repository and update them all. Will clear the
 * WorkingStates of all branches that have updated.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @return {Promise<RepositoryState>} with list of branches fetched
 */
function fetchBranches(repoState, driver) {
    var oldBranches = repoState.getBranches();
    return driver.fetchBranches()
    .then(function (branches) {
        return repoState.set('branches', branches);
    })
    .then(function refreshWorkingStates(repoState) {
        // Remove outdated WorkingStates
        return oldBranches.reduce(function (repoState, oldBranch) {
            var fullName = oldBranch.getFullName();
            var newBranch = repoState.getBranch(fullName);
            if (newBranch === null || newBranch.getSha() !== oldBranch.getSha()) {
                // Was removed OR updated
                return updateWorkingState(repoState, oldBranch, null);
            } else {
                // Unchanged
                return repoState;
            }
        }, repoState);
    });
}

/**
 * Initialize a new RepositoryState from the repo of a Driver. Fetch
 * the branches, and checkout master or the first available branch.
 * @param {Driver} driver
 * @return {Promise<RepositoryState>}
 */
function initialize(driver) {
    var repoState = RepositoryState.createEmpty();
    return fetchBranches(repoState, driver)
    .then(function (repoState) {
        var branches = repoState.getBranches();
        var master = branches.find(function isMaster(branch) {
            return branch.getFullName() === 'master';
        });
        var branch = master || branches.first();

        return fetchTree(repoState, driver, branch)
        .then(function (repoState) {
            return checkout(repoState, branch);
        });
    });
}

/**
 * Synchronize the filesystem to reflect the repository state on the given branch.
 * @param {Branch} branch
 * @return {Promise<Undefined, Error>}
 */
function syncFilesystem(driver, branch) {
    return driver.checkout(branch);
}

var RemoteUtils = {
    initialize: initialize,
    checkout: checkout,
    syncFilesystem: syncFilesystem,
    fetchTree: fetchTree,
    fetchBranches: fetchBranches,
    updateWorkingState: updateWorkingState,
    updateCurrentWorkingState: updateCurrentWorkingState
};
module.exports = RemoteUtils;
