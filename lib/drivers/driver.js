function Driver() {
}

/**
 * Fetch a blob by its sha
 * @param {sha}
 * @return {Promise<Blob>}
 */
Driver.prototype.fetchBlob = function(sha) {};

/**
 * Fetch a tree from a reference
 * @param {Ref}
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
 * @param {CommitBuilder}
 * @return {Promise<Commit>}
 */
Driver.prototype.flushCommit = function(commitBuilder) {};

/**
 * Find the closest parent of two commits
 * @param {Ref} ref1
 * @param {Ref} ref2
 * @return {Promise<Commit>}
 */
Driver.prototype.findParentCommit = function(ref1, ref2) {};

/**
 * Update a reference
 * @param {String}
 * @param {SHA}
 * @return {Promise<Undefined, ERRORS.NOT_FAST_FORWARD>}
 */
Driver.prototype.flushRef = function(ref, sha) {};

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
 * Attempts an automatic branch merging through the API.
 * @param {Branch | SHA} from A branch, or a commit SHA
 * @param {Branch} into Branch to merge into
 * @param {String} [options.message] Merge commit message
 * @return {Promise<Undefined, ERRORS.CONFLICT>}
 */
Driver.prototype.merge = function(from, into, options) {};


module.exports = Driver;
