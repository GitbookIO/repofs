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
 * @param {Ref}
 * @return {WorkingState}
 */
Driver.prototype.fetchWorkingState = function(ref) {};

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

/**
 * Create a ref
 * @param {String} ref name of the ref
 * @param {SHA} sha
 * @return {Promise}
 */
Driver.prototype.createRef = function(ref, sha) {};

/**
 * Create a branch based on another one
 * @param {Branch} base
 * @param {String} name
 */
Driver.prototype.createBranch = function(base, name) {
    return this.createRef(name, base.getSha());
};

module.exports = Driver;
