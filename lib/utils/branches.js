var ERRORS = require('../constants/errors');
var ConflictUtils = require('./conflict');
var RepoUtils = require('./repo');
var CommitUtils = require('./repo');

/**
 * Create a new branch with the given name.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {String} name
 * @return {Promise<RepositoryState>}
 */
function create(repoState, driver, name) {
    throw new Error('Repofs: Not implemented');
}

/**
 * Remove the given branch from the repository.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch} branch to remove
 * @return {Promise<RepositoryState>}
 */
function remove(repoState, driver, branch) {
    throw new Error('Repofs: Not implemented');
}

/**
 * Merge a branch into another, and update the latter's tree. To
 * handle conflicts, provide a solver callback.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch} from The branch to merge from. Must be clean
 * @param {Branch} into The branch to merge into, receives the new
 * commit. Must be clean
 * @param {String} [options.message] Merge commit message
 * @param {TreeConflict -> Promise<Map<Path, Conflict>>>} [options.solve]
 * Callback to solve conflicts. Returns the map of solved conflicts
 * @return {Promise<RepositoryState>}
 */
function merge(repoState, driver, from, into, options) {
    var intoWK = repoState.getWorkingStateForBranch(into);
    var fromWK = repoState.getWorkingStateForBranch(into);
    if(!fromWK.isClean() || !intoWK.isClean()) {
        throw new Error(['Cannot merge from',
                         from.getFullName(),
                         'into',
                         into.getFullName(),
                         'with pending changes'].join(' '));
    }

    var shouldSolve = options.solve !== undefined;

    driver.merge(from, into, {
        message: options.message
    })
    .then(function fetchTree() {
        return RepoUtils.fetchTree(repoState, driver, into);

    }, function handleConflicts(err) {
        if(!shouldSolve || err.code !== ERRORS.CONFLICT) {
            throw err;
        }
        ConflictUtils.compareTrees(repoState, from, into)
        .then(function makeSolvedTree(treeConflict) {
            return options.solve(treeConflict)
            // Merge the solved Conflicts back into treeConflict
            .then(function (solved) {
                var solvedTreeConflict = ConflictUtils.getSolvedTree(treeConflict, solved);
                // Compute the solved tree
                var commitBuilder = ConflictUtils.mergeCommit(solvedTreeConflict, {
                    parents: [from.getSha(), into.getSha()],
                    message: options.message
                });

                // Flush commit, and update branch
                return CommitUtils.flush(repoState, driver, commitBuilder, { branch: into });
            });
        });
    });
}

module.exports = {
    remove: remove,
    create: create,
    merge: merge
};
