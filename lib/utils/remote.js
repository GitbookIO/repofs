/**
 * Push a local branch to a remote repository
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch} [opts.branch] Branch to push. Default to current
 * @param {String} [opts.remote.name=origin] Name of the remote
 * @param {String} [opts.remote.url] URL if the remote needs to be created
 * @param {Boolean} [opts.force] Ignore non fast forward
 * @param {String} [opts.username] Authentication username
 * @param {String} [opts.password] Authentication password
 * @return {Promise<RepositoryState, ERROR.CANNOT_FAST_FORWARD>}
 */
function push(repoState, driver, opts) {
}

/**
 * Pull changes for local branch, from remote repository
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch} [opts.branch] Branch to pull. Default to current
 * @param {String} [opts.remote.name=origin] Name of the remote
 * @param {String} [opts.remote.url] URL if the remote needs to be created
 * @param {Boolean} [opts.force] Ignore non fast forward
 * @param {String} [opts.username] Authentication username
 * @param {String} [opts.password] Authentication password
 * @return {Promise<RepositoryState, ERROR.CANNOT_FAST_FORWARD>}
 */
function pull(repoState, driver, opts) {
}

/**
 * List remotes on the repository.
 * @return {Promise<Array<{name, url}>>}
 */
function list(driver) {
}

/**
 * Edit a remote.
 * @param {String} [opts.remote.name] Name of the remote
 * @param {String} [opts.remote.url] New URL of the remote
 */
function edit(driver, opts) {
}

module.exports = {
    push: push,
    pull: pull,
    list: list,
    edit: edit
};
