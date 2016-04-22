var _ = require('lodash');

var RepoUtils = require('./repo');

/**
 * Push a local branch to a remote repository
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch} [opts.branch] Branch to push. Default to current
 * @param {String} [opts.remote.name=origin] Name of the remote
 * @param {String} [opts.remote.url] URL if the remote needs to be created
 * @param {Boolean} [opts.force=false] Ignore non fast forward
 * @param {String} [opts.auth.username] Authentication username
 * @param {String} [opts.auth.password] Authentication password
 * @return {Promise<RepositoryState, ERROR.NOT_FAST_FORWARD>}
 */
function push(repoState, driver, opts) {
    var that = this;

    opts = _.defaults({}, opts || {}, {
        branch: repoState.getCurrentBranch(),
        force: false,
        remote: {
            name: 'origin'
        }
    });

    return that.driver.push(opts) // Can fail with NOT_FAST_FORWARD
    // TODO update remote branch
    .thenResolve(repoState);
}

/**
 * Pulls changes for local branch, from remote repository. Loses any
 * pending changes on it.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch} [opts.branch] Branch to pull. Default to current
 * @param {String} [opts.remote.name=origin] Name of the remote
 * @param {String} [opts.remote.url] URL if the remote needs to be created
 * @param {Boolean} [opts.force=false] Ignore non fast forward
 * @param {String} [opts.auth.username] Authentication username
 * @param {String} [opts.auth.password] Authentication password
 * @return {Promise<RepositoryState, ERROR.NOT_FAST_FORWARD>}
 */
function pull(repoState, driver, opts) {
    var that = this;

    opts = _.defaults({}, opts || {}, {
        branch: repoState.getCurrentBranch(),
        force: false,
        remote: {
            name: 'origin'
        }
    });

    return that.driver.pull(opts)
    .then(function() {
        return RepoUtils.fetchTree(repoState, driver, opts.branch);
    });
}

/**
 * List remotes on the repository.
 * @param {Driver} driver
 * @return {Promise<Array<{name, url}>>}
 */
function list(driver) {
    return driver.listRemotes();
}

/**
 * Edit or create a remote.
 * @param {Driver} driver
 * @param {String} name Name of the remote
 * @param {String} url New URL of the remote
 */
function edit(driver, name, url) {
    return driver.editRemote(name, url);
}

var RemoteUtils = {
    push: push,
    pull: pull,
    list: list,
    edit: edit
};
module.exports = RemoteUtils;

