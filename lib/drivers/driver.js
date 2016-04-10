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
 * @param {CommitBuider}
 * @return {Promise<Commit>}
 */
Driver.prototype.flushCommit = function(commit) {};

/**
 * Update a reference
 * @param {String}
 * @param {SHA}
 * @return {Promise}
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
