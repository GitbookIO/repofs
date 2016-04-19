var WorkingUtils = require('./working');
var RepositoryState = require('../models/repositoryState');

/**
 * Change workinState for a specific branch
 * @param {RepositoryState}
 * @param {Branch}
 * @param {WorkingState}
 * @return {RepositoryState}
 */
function updateWorkingState(repoState, branch, workingState) {
    var workingStates = repoState.getWorkingStates();

    // Update the entry in the map
    workingStates = workingStates.set(branch.getName(), workingState);

    return repoState.set('workingStates', workingStates);
}

/**
 * Change current working tree
 */
function updateCurrentWorkingState(repoState, workingState) {
    return updateWorkingState(repoState, repoState.getCurrentBranch(), workingState);
}

/**
 * Fetches the given branch tree and **resets any WorkingState for it**
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
 * @param {RepositoryState}
 * @param {Branch}
 * @return {RepositoryState}
 */
function checkout(repoState, branch) {
    if(!repoState.isFetched(branch)) {
        throw Error('Tree for branch '+branch.getName()+' must be fetched first');
    }
    return repoState.set('currentBranchName', branch.getName());
}

/**
 * Fetch the list of branches in the repository
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @return {Promise<RepositoryState>} with list of branches fetched
 */
function fetchBranches(repoState, driver) {
    return driver.fetchBranches()
    .then(function(branches) {
        return repoState.set('branches', branches);
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

module.exports = {
    initialize: initialize,
    checkout: checkout,
    fetchTree: fetchTree,
    fetchBranches: fetchBranches,
    updateWorkingState: updateWorkingState,
    updateCurrentWorkingState: updateCurrentWorkingState
};
