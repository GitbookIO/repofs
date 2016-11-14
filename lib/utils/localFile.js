var FILETYPE = require('../constants/filetype');
var LocalFile = require('../models/localFile');
var Branch = require('../models/branch');

var LocalUtils = module.exports;

/**
 * Perform a git status on a given repository branch
 *
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @return {Promise<List<LocalFile>>}
 */
LocalUtils.status = function status(repoState, driver) {
    var branchName = repoState.getCurrentBranchName();
    var branch = new Branch({
        name: branchName
    });

    return driver.status({
        branch: branch
    });
};

/**
 * Perform track / untrack of working directory.
 *
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {String} message
 * @param {Author} author
 * @return {Promise}
 */
LocalUtils.track = function track(driver, files, message, author) {
    files = files.map(function (file) {
        return LocalFile.create(file);
    });

    return driver.track({
        message: message,
        files: files,
        author: author,
        committer: author
    });
};
