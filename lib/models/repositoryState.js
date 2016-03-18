var _ = require('lodash');
var immutable = require('immutable');

var WorkingState = require('./workingState');
var Branch = require('./branch');
var Cache = require('./cache');

/*
Repository represents a map of WorkingTree with a current active one
*/
var RepositoryState = immutable.Record({
    currentBranchName: 'master', // Current branch full name
    workingStates: new immutable.Map(), // Map<String, WorkingState> indexed by local branch fullnames
    branches: new immutable.List(), // List<Branch>
    cache: new Cache()
});

// ---- Properties Getter ----
RepositoryState.prototype.getCurrentBranchName = function() {
    return this.get('currentBranchName');
};

RepositoryState.prototype.getWorkingStates = function() {
    return this.get('workingStates');
};

RepositoryState.prototype.getBranches = function() {
    return this.get('branches');
};

RepositoryState.prototype.getCache = function() {
    return this.get('cache');
};

// ---- Methods ----

// Return a branch by its name
// @param {String}
// @return {Branch}
RepositoryState.prototype.getBranch = function(branchName) {
    return this.getBranches()
        .find(function(branch) {
            return branchName == branch.getFullName();
        });
};

// Return current active branch
// @return {Branch}
RepositoryState.prototype.getCurrentBranch = function() {
    return this.getBranch(this.getCurrentBranchName());
};

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


// Encodes a RepositoryState as a JSON object
// @param {RepositoryState}
// @return {Object} As plain JS
RepositoryState.encode = function (repoState) {
    return {
        currentBranchName: repoState.get('currentBranchName'),
        workingStates: repoState.get('workingStates').map(WorkingState.encode).toJS(),
        branches: repoState.get('branches').map(Branch.encode).toJS()
    };
};

RepositoryState.decode = function (json) {
    var workingStates = new immutable.Map(_.mapValues(json.workingStates, WorkingState.decode));
    var branches = new immutable.Map(_.mapValues(json.branches, Branch.decode));

    return new RepositoryState({
        currentBranchName: json.currentBranchName,
        workingStates: workingStates,
        branches: branches
    });
};



module.exports = RepositoryState;
