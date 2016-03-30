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
 * Attempts to merge two branches.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch} from The branch to merge from
 * @param {Branch} into The branch to merge into, that receive a new commit
 * @return {Promise<RepositoryState, ConflictError>} TODO Design the workflow for conflicts.
 */
function merge(repoState, driver, from, into) {
    throw new Error('Repofs: Not implemented');
}

module.exports = {
    remove: remove,
    create: create,
    merge: merge
};
