const LocalFile = require('../models/localFile');

const LocalUtils = module.exports;

/**
 * Perform a git status on a given repository branch
 *
 * @param {Driver} driver
 * @return {Promise<List<LocalFile>>}
 */
LocalUtils.status = function status(driver) {
    return driver.status();
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
    files = files.map(function(file) {
        return LocalFile.create(file);
    });

    return driver.track({
        message,
        files,
        author,
        committer: author
    });
};
