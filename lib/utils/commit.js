var immutable = require('immutable');

var CommitBuilder = require('../models/commitBuilder');
var WorkingUtils = require('./working');
var RepoUtils = require('./repo');


// Create a commit builder from a workingState
// @param {RepositoryState}
// @param {author:Author, message: String}
function prepareCommit(repoState, opts) {
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

    // Create map of blobs
    opts.blobs = changes.map(function(change) {
        return change.getBlob();
    });

    return new CommitBuilder(opts);
}

// Flush a commit using a driver
// Then update the reference, pull new workingState
function flush(driver, repoState, commitBuilder) {
    var currentBranch = repoState.getCurrentBranch();

    // Create new commit
    return driver.flushCommit(commitBuilder)

    // Update reference
    .then(function(commit) {
        return driver.flushRef(currentBranch.getName(), commit.getSha());
    })

    // Fetch new workinState
    .then(function() {
        return RepoUtils.fetchBranch(repoState, driver, currentBranch);
    });
}

module.exports = {
    prepare: prepareCommit,
    flush: flush
};
