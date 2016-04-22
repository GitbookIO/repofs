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
        return repoState.updateBranch(branch, null);
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
 * @param {Boolean} [options.fetch=true] Fetch the updated tree on `into` branch ?
 * @return {Promise<RepositoryState, ERRORS.CONFLICT>} Fails with
 * CONFLICT error if automatic merge is not possible
 */
function merge(repoState, driver, from, into, options) {
    options = _.defaults({}, options || {}, {
        fetch: true
    });
    var updatedInto; // closure

    return driver.merge(from, into, {
        message: options.message
    }) // Can fail here with ERRORS.CONFLICT
    .then(function updateInto(mergeCommit) {
        if (!mergeCommit) {
            // Was a no op
            return repoState;
        } else {
            updatedInto = into.set('sha', mergeCommit.getSha());
            repoState = repoState.updateBranch(into, updatedInto);
            // invalidate working state
            return RepoUtils.updateWorkingState(repoState, into, null);
        }
    })
    .then(function fetchTree(repoState) {
        if (!options.fetch) {
            return repoState;
        } else {
            return RepoUtils.fetchTree(repoState, driver, updatedInto);
        }
    });
}

var BranchUtils = {
    remove: remove,
    create: create,
    merge: merge
};
module.exports = BranchUtils;
