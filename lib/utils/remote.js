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
 * @return {Promise<RepositoryState>}
 * @throws {Promise<ERROR.NOT_FAST_FORWARD>}
 * @throws {Promise<ERROR.AUTHENTICATION_FAILED>}
 * @throws {Promise<ERROR.UNKNOWN_REMOTE>}
 */
function push(repoState, driver, opts) {
    opts = _.defaults({}, opts || {}, {
        branch: repoState.getCurrentBranch(),
        force: false,
        remote: {
            name: 'origin'
        }
    });

    return driver.push(opts) // Can fail with NOT_FAST_FORWARD
    // TODO update remote branch in repoState list of branches
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
 * @return {Promise<RepositoryState>}
 * @throws {Promise<ERROR.NOT_FAST_FORWARD>}
 * @throws {Promise<ERROR.AUTHENTICATION_FAILED>}
 * @throws {Promise<ERROR.UNKNOWN_REMOTE>}
 */
function pull(repoState, driver, opts) {
    opts = _.defaults({}, opts || {}, {
        branch: repoState.getCurrentBranch(),
        force: false,
        remote: {
            name: 'origin'
        }
    });

    return driver.pull(opts)
    // Update branch SHA
    .then(function () {
        return driver.fetchBranches();
    })
    .then(function (branches) {
        var updatedBranch = branches.find(function (br) {
            return br.getFullName() === opts.branch.getFullName();
        });
        repoState = repoState.updateBranch(opts.branch, updatedBranch);

        return RepoUtils.fetchTree(repoState, driver, updatedBranch);
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

