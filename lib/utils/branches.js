var immutable = require('immutable');
var _ = require('lodash');

var RepoUtils = require('./repo');

/**
 * Create a new branch with the given name.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {String} name
 * @param {Branch} [opts.base] Base branch, default to current branch
 * @param {Boolean} [opts.checkout=false] Directly fetch and checkout the branch
 * @return {Promise<RepositoryState>}
 */
function create(repoState, driver, name, opts) {
    var base = opts.base || repoState.getCurrentBranch();
    var createdBranch;
    var result = driver.createBranch(base, name)
    // Update list of branches
    .then(function (branch) {
        createdBranch = branch;
        var branches = repoState.getBranches();
        branches = branches.push(createdBranch);
        return repoState.set('branches', branches);
    });

    if (!opts.checkout) {
        return result;
    } else {
        return result
        .then(function fetchBaseTree(repoState) {
            if (!opts.checkout) {
                return repoState;
            }
            var baseWk = repoState.getWorkingStateForBranch(base);
            if (baseWk !== null) {
                // Reuse base WorkingState clean
                baseWk = baseWk.asClean();
                return RepoUtils.updateWorkingState(repoState, createdBranch, baseWk);
            } else {
                // Fetch it
                return RepoUtils.fetchTree(repoState, driver, createdBranch);
            }
        })
        // Checkout
        .then(function (repoState) {
            return RepoUtils.checkout(repoState, createdBranch);
        });
    }
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
