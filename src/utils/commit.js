const Q = require('q');
const Immutable = require('immutable');

const ERRORS = require('../constants/errors');

const CommitBuilder = require('../models/commitBuilder');
const WorkingUtils = require('./working');
const RepoUtils = require('./repo');

/**
 * Create a commit builder from the changes on current branch
 * @param {RepositoryState}
 * @param {Author} opts.author
 * @param {String} [opts.message]
 * @return {CommitBuilder}
 */
function prepare(repoState, opts) {
    const workingState = repoState.getCurrentState();
    const changes = workingState.getChanges();

    // Is this an empty commit ?
    opts.empty = workingState.isClean();

    // Parent SHA
    opts.parents = new Immutable.List([
        workingState.getHead()
    ]);

    // Get merged tree (with applied changes)
    opts.treeEntries = WorkingUtils.getMergedTreeEntries(workingState);

    // Create map of blobs that needs to be created
    opts.blobs = changes.filter((change) => {
        return !change.hasSha();
    }).map((change) => {
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
 * @param {Boolean} [options.ignoreEmpty=true] Empty commits are
 * ignored, unless they merge several branches.
 * @return {Promise<RepositoryState, ERRORS.NOT_FAST_FORWARD>} If the
 * branch cannot be fast forwarded to the created commit, fails with
 * NOT_FAST_FORWARD. The error will contains the created Commit.
 */
function flush(repoState, driver, commitBuilder, options = {}) {
    options = Object.assign({
        branch: repoState.getCurrentBranch(),
        ignoreEmpty: true
    }, options);

    if (options.ignoreEmpty
        && commitBuilder.isEmpty()
        && commitBuilder.getParents().count() < 2) {
        return Q(repoState);
    }

    // Create new commit
    return driver.flushCommit(commitBuilder)
    // Forward the branch
    .then((commit) => {
        return driver.forwardBranch(options.branch, commit.getSha())
        // Fetch new workingState and replace old one
        .then(function updateBranch() {
            const updated = options.branch.set('sha', commit.getSha());
            return repoState.updateBranch(options.branch, updated);

        }, function nonFF(err) {
            if (err.code === ERRORS.NOT_FAST_FORWARD) {
                // Provide the created commit to allow merging it back.
                err.commit = commit;
            }
            throw err;
        });
    })
    .then(function updateWorkingState(forwardedRepoState) {
        const forwardedBranch = forwardedRepoState.getBranch(options.branch.getFullName());
        return RepoUtils.fetchTree(forwardedRepoState, driver, forwardedBranch);
    });
}

/**
 * @param {Driver} driver
 * @param {Branch} options.branch Branch to list commit on
 * @param {Ref} [options.ref] Use a ref or SHA instead of a branch
 * @param {Path} [options.path] Filter by file
 * @param {String} [options.author] Filter by author name
 * @param {Number} [options.per_page] Limits number of result
 * @return {Promise<List<Commit>>} The history of commits behind this
 * branch or ref. Recent first.
 */
function fetchList(driver, options) {
    // do we really need repoState as argument ?
    options = options || {};

    let ref;
    if (options.ref) {
        ref = options.ref;
    } else {
        ref = options.branch.getFullName();
    }

    options.ref = ref;

    return driver.listCommits(options);
}

/**
 * List all the commits reachable from head, but not from base. Most
 * recent first.
 * @param {Driver} driver
 * @param {Branch | SHA} base
 * @param {Branch | SHA} head
 * @return {Promise<List<Commit>>}
 */
function fetchOwnCommits(driver, base, head) {
    return driver.fetchOwnCommits(base, head);
}

/**
 * Get a single commit, with files patch
 * @param {Driver} driver
 * @param {SHA} sha
 * @return {Promise<Commit>}
 */
function fetch(driver, sha) {
    return driver.fetchCommit(sha);
}

/**
 * Compare two commits/branch
 * @param {Driver} driver
 * @param {SHA or Branch} base
 * @param {SHA or Branch} head
 * @return {Promise<Compare>}
 */
function fetchCompare(driver, base, head) {
    return driver.fetchCompare(base, head);
}

const CommitUtils = {
    prepare,
    flush,
    fetchList,
    fetchOwnCommits,
    fetch,
    fetchCompare
};
module.exports = CommitUtils;
