var CommitBuilder = require('../models/commitBuilder');
var WorkingUtils = require('./working');


// Create a commit builder from a workingState
// @param {RepositoryState}
// @param {author:Author, message: String}
function prepareCommit(repoState, opts) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();

    // Default commit message
    opts.message = opts.message || workingState.getCommitMessage();

    // Get merged tree (with applied changes)
    opts.treeEntries = WorkingUtils.getMergedFileSet(workingState);

    // Create map of blobs
    opts.blobs = changes.map(function(change) {
        return change.getBlob();
    });

    return new CommitBuilder(opts);
}

// Flush a commit using a driver
function flush(driver, commitBuilder) {
    return driver.flushCommit(commitBuilder);
}

module.exports = {
    prepare: prepareCommit,
    flush: flush
};
