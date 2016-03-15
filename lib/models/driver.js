function Driver() {

}

// Fetch a blob using its SHA
// Return an object {sha,content}
Driver.prototype.fetchBlob = function(sha) {

};

// Fetch a tree using a ref name
// Return an object {sha,entries}
//  "sha" is the SHA of the head commit
Driver.prototype.fetchTree = function(ref) {

};

// Fetch list of branches
Driver.prototype.fetchBranches = function() {

};

module.exports = Driver;
