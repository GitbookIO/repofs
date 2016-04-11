var _ = require('lodash');
var immutable = require('immutable');

var CommitBuilder = require('../models/commitBuilder');
var WorkingUtils = require('./working');
var RepoUtils = require('./repo');


/**
 * Create a commit builder from the changes on current branch
 * @param {RepositoryState}
 * @param {Object} [opts] Options object
 * @param {Author} [opts.author]
 * @param {String} [opts.message]
 * @return {CommitBuilder}
 */
function prepare(repoState, opts) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();

    // Parent SHA
    opts.parents = new immutable.List([
        workingState.getHead()
    ]);

    // Default commit message
    opts.message = opts.message || workingState.getCommitMessage();

    // Get merged tree (with applied changes)
    opts.treeEntries = WorkingUtils.getMergedTreeEntries(workingState);

    // Create map of blobs that needs to be created
    opts.blobs = changes.filter(function (change) {
        return !change.hasSha();
    }).map(function (change) {
        return change.getContent();
    });

    return new CommitBuilder(opts);
}

/**
 * Flush a commit from the current branch using a driver
 * Then update the reference, and pull new workingState
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {CommitBuilder} commitBuilder
 * @param {Branch} [options.branch] Optional branch to use instead of
 * current branch
 * @return {Promise<RepositoryState>}
 */
function flush(repoState, driver, commitBuilder, options) {
    options = _.defaults({}, options || {}, {
        branch: repoState.getCurrentBranch()
    });

    // Create new commit
    return driver.flushCommit(commitBuilder)

    // Update reference
    .then(function(commit) {
        return driver.flushRef(options.branch.getName(), commit.getSha());
    })

    // Fetch new workingState and replace old one
    .then(function() {
        return RepoUtils.fetchBranch(repoState, driver, options.branch);
    });
}

module.exports = {
    prepare: prepare,
    flush: flush
};
