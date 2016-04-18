var _ = require('lodash');
var immutable = require('immutable');

var ERRORS = require('../constants/errors');

var CommitBuilder = require('../models/commitBuilder');
var WorkingUtils = require('./working');
var RepoUtils = require('./repo');

/**
 * Create a commit builder from the changes on current branch
 * @param {RepositoryState}
 * @param {Author} opts.author
 * @param {String} opts.message
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

    return CommitBuilder.create(opts);
}

/**
 * Flush a commit from the current branch using a driver
 * Then update the reference, and pull new workingState
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {CommitBuilder} commitBuilder
 * @param {Branch} [options.branch] Optional branch to use instead of
 * current branch
 * @return {Promise<RepositoryState, ERRORS.NON_FAST_FORWARD>} If the
 * branch cannot be fast forwarded to the created commit, fails with
 * NON_FAST_FORWARD. The error will contains the created Commit.
 */
function flush(repoState, driver, commitBuilder, options) {
    options = _.defaults({}, options || {}, {
        branch: repoState.getCurrentBranch()
    });

    // Create new commit
    return driver.flushCommit(commitBuilder)

    // Forward the branch
    .then(function(commit) {
        return driver.forwardBranch(options.branch, commit.getSha())
        // Fetch new workingState and replace old one
        .fail(function nonFF(err) {
            if(err.code === ERRORS.NON_FAST_FORWARD) {
                // Provide the created commit to allow merging it back.
                err.commit = commit;
            }
            throw err;
        });
    })
    .then(function updateBranches() {
        return RepoUtils.fetchBranches(repoState, driver);
    })
    .then(function updateWorkingState() {
        return RepoUtils.fetchTree(repoState, driver, options.branch);
    });
}
/**
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Branch} [options.branch] Optional branch to use instead of
 * current branch
 * @param {Ref} [options.ref] Use a ref or SHA instead of a branch
 * @param {Path} [options.path] Filter by file
 * @param {String} [options.author] Filter by author name
 * @param {Number} [options.per_page] Limite number of result
 * @return {Promise<List<Commit>>} The history of commits behind this
 * branch or ref. Recent first.
 */
function listCommits(repoState, driver, options) {
    // do we really need repoState as argument ?
    options = options || {};

    var ref;
    if (options.ref) {
        ref = options.ref;
    } else if (options.branch) {
        ref = options.branch.getFullName();
    } else {
        ref = repoState.getCurrentBranch().getFullName();
    }

    options.ref = ref;

    return driver.listCommits(options);
}

/**
 * Get a single commit, with files patch
 * @param {Driver} driver
 * @param {SHA} sha
 * @return {Promise<Commit>}
 */
function fetchCommit(driver, sha) {
    return driver.fetchCommit(sha);
}

module.exports = {
    prepare: prepare,
    flush: flush,
    listCommits: listCommits,
    fetchCommit: fetchCommit
};
