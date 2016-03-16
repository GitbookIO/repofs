var util = require('util');
var immutable = require('immutable');

var Cache = require('./cache');

/*
Repository represents a map of WorkingTree with a current active one
*/

var RepositoryRecord = immutable.Record({
    currentBranchName: 'master', // Current branch full name
    workingStates: new immutable.Map(), // Map<String, WorkingState> indexed by local branch fullnames
    branches: new immutable.OrderedMap(), // Map<String, Branch> indexed by branch fullnames
    cache: new Cache()
});

function RepositoryState() {

}
util.inherits(RepositoryState, RepositoryRecord);

// ---- Properties Getter ----
RepositoryState.prototype.getCurrentBranch = function() {
    return this.getBranch(this.getCurrentBranchName());
};

RepositoryState.prototype.getCurrentBranchName = function() {
    return this.get('currentBranchName');
};

RepositoryState.prototype.getWorkingStates = function() {
    return this.get('workingStates');
};

RepositoryState.prototype.getBranches = function() {
    return this.get('branches');
};

RepositoryState.prototype.getBranch = function(branchName) {
    return this.getBranches().get(branchName);
};

RepositoryState.prototype.getCache = function() {
    return this.get('cache');
};

// ---- Methods ----

// Return working state for the current branch
RepositoryState.prototype.getCurrentState = function() {
    return this.getWorkingStateForBranch(this.getCurrentBranch());
};

// Returns working state for given branch
// @param {Branch}
RepositoryState.prototype.getWorkingStateForBranch = function(branch) {
    var states = this.getWorkingStates();
    return states.get(branch.getName());
};

// Check that a branch exists with the given name
// @param {Branch}
RepositoryState.prototype.hasBranch = function(branch) {
    return this.getBranches().has(branch.getName());
};

// Check that a branch has been fetched
// @param {Branch}
RepositoryState.prototype.isFetched = function(branch) {
    return this.getWorkingStates().has(branch.getName());
};

// ---- Statics ----

// Create a new empty WorkingTree
RepositoryState.createEmpty = function createEmpty() {
    return new RepositoryState({});
};


module.exports = RepositoryState;
