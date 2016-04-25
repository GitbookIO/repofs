var _ = require('lodash');
var immutable = require('immutable');

var WorkingState = require('./workingState');
var Branch = require('./branch');
var Cache = require('./cache');

/**
 * Repository represents a map of WorkingTree with a current active
 * one
 */
var RepositoryState = immutable.Record({
    currentBranchName: null, // Current branch full name
    workingStates: new immutable.Map(), // Map<String, WorkingState> indexed by local branch fullnames
    branches: new immutable.List(), // List<Branch>
    cache: new Cache()
}, 'RepositoryState');

// ---- Properties Getter ----

/**
 * @return {String} Current branch fullname
 */
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

/**
 * Return a branch by its name
 * @param {String}
 * @return {Branch | Null}
 */
RepositoryState.prototype.getBranch = function(branchName) {
    var branch = this.getBranches()
            .find(function(branch) {
                return branchName == branch.getFullName();
            });
    return branch || null;
};

/**
 * Return all local branches
 * @return {List<Branch>}
 */
RepositoryState.prototype.getLocalBranches = function() {
    return this.getBranches().filter(
        function onlyLocal(branch) {
            return !branch.isRemote();
        }
    );
};

/**
 * Return current active branch
 * @return {Branch | Null}
 */
RepositoryState.prototype.getCurrentBranch = function() {
    return this.getBranch(this.getCurrentBranchName());
};

/**
 * Return working state for the current branch
 * @return {WorkingState}
 */
RepositoryState.prototype.getCurrentState = function() {
    var currentBranch = this.getCurrentBranch();
    if (currentBranch === null) {
        return WorkingState.createEmpty();
    } else {
        return this.getWorkingStateForBranch(currentBranch);
    }
};

/**
 * Returns working state for given branch
 * @param {Branch}
 * @return {WorkingState | Null}
 */
RepositoryState.prototype.getWorkingStateForBranch = function(branch) {
    var states = this.getWorkingStates();
    return states.get(branch.getFullName()) || null;
};

/**
 * Check if a branch exists with the given name
 * @param {String} fullname Such as 'origin/master' or 'develop'
 */
RepositoryState.prototype.hasBranch = function(fullname) {
    return this.getBranches().some(function (branch) {
        return branch.getFullName() === fullname;
    });
};

/**
 * Check that a branch has been fetched
 * @param {Branch}
 */
RepositoryState.prototype.isFetched = function(branch) {
    return this.getWorkingStates().has(branch.getFullName());
};

/**
 * @param {Branch} branch Branch to update
 * @param {Branch | Null} value New branch value, null to delete
 */
RepositoryState.prototype.updateBranch = function (branch, value) {
    var branches = this.getBranches();
    var index = branches.findIndex(function (br) {
        return br.getFullName() === branch.getFullName();
    });
    if (value === null) {
        // Delete
        branches = branches.remove(index);
    } else {
        // Update
        branches = branches.set(index, value);
    }
    return this.set('branches', branches);
};

// ---- Statics ----

/**
 * Creates a new empty WorkingTree
 */
RepositoryState.createEmpty = function createEmpty() {
    return new RepositoryState({});
};


/**
 * Encodes a RepositoryState as a JSON object
 * @param {RepositoryState}
 * @return {Object} As plain JS
 */
RepositoryState.encode = function (repoState) {
    return {
        currentBranchName: repoState.get('currentBranchName'),
        workingStates: repoState.get('workingStates').map(WorkingState.encode).toJS(),
        branches: repoState.get('branches').map(Branch.encode).toJS()
    };
};

RepositoryState.decode = function (json) {
    var workingStates = new immutable.Map(_.mapValues(json.workingStates, WorkingState.decode));
    var branches = new immutable.List(_.map(json.branches, Branch.decode));

    return new RepositoryState({
        currentBranchName: json.currentBranchName,
        workingStates: workingStates,
        branches: branches
    });
};

module.exports = RepositoryState;
