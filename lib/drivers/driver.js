function Driver() {
}

/**
 * Fetch a blob by its sha
 * @param {SHA} sha
 * @return {Promise<Blob>}
 */
Driver.prototype.fetchBlob = function(sha) {};

/**
 * Fetch a tree from a reference
 * @param {Ref} ref
 * @return {Promise<WorkingState>}
 */
Driver.prototype.fetchWorkingState = function(ref) {};

/**
 * Fetch branches listing
 * @return {Promise<List<Branch>>}
 */
Driver.prototype.fetchBranches = function() {};

/**
 * Flush a commit
 * @param {CommitBuilder} commitBuilder
 * @return {Promise<Commit>}
 */
Driver.prototype.flushCommit = function(commitBuilder) {};


/**
 * @param {Ref} [options.ref=master]
 * @param {Path} [options.path] Filter containing the file
 * @param {String} [options.author] Filter by author name
 * @param {Number} [options.per_page] Limite number of result
 * @return {Promise<List<Commit>>} Commits without files patch
 */
Driver.prototype.listCommits = function(options) {};

/**
 * Get a single commit, with files patch
 * @param {SHA} sha
 * @return {Promise<Commit>}
 */
Driver.prototype.fetchCommit = function(sha) {};

/**
 * Find the closest parent of two commits
 * @param {Ref} ref1
 * @param {Ref} ref2
 * @return {Promise<Commit>}
 */
Driver.prototype.findParentCommit = function(ref1, ref2) {};

/**
 * Update a branch forward to a given commit
 * @param {Branch} branch
 * @param {SHA} sha Commit sha
 * @return {Promise<Undefined, ERRORS.NOT_FAST_FORWARD>}
 */
Driver.prototype.forwardBranch = function(branch, sha) {};

/**
 * Create a reference
 * @param {String} ref name of the ref
 * @param {SHA} sha
 * @return {Promise}
 */
Driver.prototype.createRef = function(ref, sha) {};

/**
 * Create a branch based on another one
 * @param {Branch} base
 * @param {String} name
 * @return {Promise<Branch>}
 */
Driver.prototype.createBranch = function(base, name) {};

/**
 * Delete a branch
 * @param {Branch} branch
 * @return {Promise}
 */
Driver.prototype.deleteBranch = function(base, name) {};

/**
 * Attempts an automatic merging through the API.
 * @param {Branch | SHA} from A branch, or a commit SHA
 * @param {Branch} into Branch to merge into
 * @param {String} [options.message] Merge commit message
 * @return {Promise<Undefined, ERRORS.CONFLICT>}
 */
Driver.prototype.merge = function(from, into, options) {};

// ---- Remotes (Not implemented by all APIs) ----

/**
 * List remotes on the repository.
 * @return {Promise<Array<{name, url}>>}
 */
Driver.prototype.listRemotes = function () {};

/**
 * Edit a remote.
 * @param {String} [name] Name of the remote
 * @param {String} [url] New URL of the remote
 */
Driver.prototype.editRemotes = function (name, url) {};

/**
 * Pull changes for local branch, from remote repository
 * @param {Branch} opts.branch Branch to pull. Default to current
 * @param {String} opts.remote.name Name of the remote
 * @param {String} [opts.remote.url] URL if the remote needs to be created
 * @param {Boolean} [opts.force=false] Ignore non fast forward
 * @param {String} [opts.auth.username] Authentication username
 * @param {String} [opts.auth.password] Authentication password
 * @return {Promise<Undefined, ERROR.CANNOT_FAST_FORWARD>}
 */
Driver.prototype.pull = function (opts) {};


/**
 * Push a local branch to a remote repository
 * @param {Branch} opts.branch Branch to push. Default to current
 * @param {String} opts.remote.name Name of the remote
 * @param {String} [opts.remote.url] URL if the remote needs to be created
 * @param {Boolean} [opts.force=false] Ignore non fast forward
 * @param {String} [opts.auth.username] Authentication username
 * @param {String} [opts.auth.password] Authentication password
 * @return {Promise<Undefined, ERROR.CANNOT_FAST_FORWARD>}
 */
Driver.prototype.push = function (opts) {};

module.exports = Driver;
