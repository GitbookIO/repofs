var FILETYPE = require('../constants/filetype');
var LocalFile = require('../models/localFile');
var Branch = require('../models/branch');

var LocalFileUtils = module.exports;

/**
 * Perform a git status on a given repository branch
 *
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @return {Promise<List<LocalFile>>}
 */
LocalFileUtils.status = function status(repoState, driver) {
    var branchName = repoState.getCurrentBranchName();
    var branch = new Branch({
        name: branchName
    });

    return driver.status({
        branch: branch
    });
};
