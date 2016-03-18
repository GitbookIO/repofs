function Driver() {

}

// Fetch a blob by its sha
// @param {sha}
// @return {Blob}
Driver.prototype.fetchBlob = function(sha) {};

// Fetch a tree from a reference
// @param {ref}
// @return {WorkingState}
Driver.prototype.fetchWorkingState = function(branch) {};

// Fetch branches listing
// @return {List<Branch>}
Driver.prototype.fetchBranches = function() {};

// Flush a commit
// @param {CommitBuider}
Driver.prototype.flushCommit = function(commit) {}

module.exports = Driver;
