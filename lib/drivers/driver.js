function Driver() {

}

/**
 * Fetch a blob by its sha
 * @param {sha}
 * @return {Blob}
 */
Driver.prototype.fetchBlob = function(sha) {};

/**
 * Fetch a tree from a reference
 * @param {ref}
 * @return {WorkingState}
 */
Driver.prototype.fetchWorkingState = function(branch) {};

/**
 * Fetch branches listing
 * @return {List<Branch>}
 */
Driver.prototype.fetchBranches = function() {};

/**
 * Flush a commit
 * @param {CommitBuider}
 * @return {Commit}
 */
Driver.prototype.flushCommit = function(commit) {};

/**
 * Update a reference
 * @param {String}
 * @param {SHA}
 */
Driver.prototype.flushRef = function(ref, sha) {};

module.exports = Driver;
