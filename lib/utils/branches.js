var immutable = require('immutable');
var RepoUtils = require('./repo');

/**
 * Create a new branch with the given name.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {String} name
 * @return {Promise<RepositoryState>}
 */
function create(repoState, driver, name) {
    return driver.createBranch(repoState.getCurrentBranch(), name)
    // Update list of branches
    .then(function (createdBranch) {
        var branches = repoState.getBranches();
        branches = branches.push(createdBranch);
        return repoState.set('branches', branches);
    });
}

/**
 * Remove the given branch from the repository.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch} branch to remove
 * @return {Promise<RepositoryState>}
 */
function remove(repoState, driver, branch) {
    return driver.deleteBranch(branch)
    .then(function () {
        var branches = repoState.getBranches();
        branches = branches.filter(function (br) {
            return immutable.is(br, branch);
        });
        return repoState.set('branches', branches);
    });
}

/**
 * Merge a branch/commit into a branch, and update that branch's tree.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch | SHA} from The branch to merge from, or a commit SHA
 * @param {Branch} into The branch to merge into, receives the new
 * commit. Must be clean
 * @param {String} [options.message] Merge commit message
 * @return {Promise<RepositoryState, ERRORS.CONFLICT>} Fails with
 * CONFLICT error if automatic merge is not possible
 */
function merge(repoState, driver, from, into, options) {
    var intoWK = repoState.getWorkingStateForBranch(into);
    var fromWK = repoState.getWorkingStateForBranch(from);
    if(!fromWK.isClean() || !intoWK.isClean()) {
        throw new Error(['Cannot merge from',
                         from.getFullName(),
                         'into',
                         into.getFullName(),
                         'with pending changes'].join(' '));
    }

    driver.merge(from, into, {
        message: options.message
    })
    .then(function fetchTree() {
        return RepoUtils.fetchTree(repoState, driver, into);
    }); // Can fail with ERRORS.CONFLICT
}

module.exports = {
    remove: remove,
    create: create,
    merge: merge
};
