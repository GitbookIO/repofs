
function Driver(options) {

}

// Fetch the whole tree for the given ref
Driver.prototype.fetchTree = function(ref) {

};

// Fetch content of a blob
Driver.prototype.fetchBlob = function(ref) {

};

// List branches
Driver.prototype.listBranches = function(p, opts) {

};

// Create a branch
Driver.prototype.createBranch = function(name, from) {

};

// Remove a branch
Driver.prototype.removeBranch = function(name) {

};

// Merge branches
Driver.prototype.mergeBranches = function(from, to, opts) {

};

// Commit pending changes
Driver.prototype.commitChanges = function(base, commit) {

};

// List commits
Driver.prototype.listCommits = function(opts) {

};

// Get a single commit
Driver.prototype.getCommit = function(sha) {

};

// Compare two commits
Driver.prototype.compareCommits = function(base, head, opts) {

};

// List remotes
Driver.prototype.listRemotes = function(opts) {

};

// Edit a remote
Driver.prototype.editRemote = function(opts) {

};

// Checkout a branch
Driver.prototype.checkout = function(branch, opts) {

};

// Fetch a remote
Driver.prototype.fetch = function(opts) {

};

// Push to a remote
Driver.prototype.push = function(opts) {

};

// Pull from a remote
Driver.prototype.pull = function(opts) {

};

Driver.id = 'basic';
module.exports = Driver;

