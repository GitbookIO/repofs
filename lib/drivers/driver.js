function Driver() {

}

// Fetch a blob content from its SHA
// @return {Object(sha: String, content: ArrayBuffer)}
Driver.prototype.fetchBlob = function(sha) {};

// Fetch a tree for a branch
// @param {Branch}
// @return {Object(sha: String, entries:Array<TreeEntry>)} "sha" is the SHA of the head commit
Driver.prototype.fetchTree = function(branch) {};

// Fetch list of branches
// @return {Array<Branch>}
Driver.prototype.fetchBranches = function() {};

module.exports = Driver;
