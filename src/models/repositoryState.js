const { Record, Map, List } = require('immutable');

const modifyValues = require('modify-values');
const Normalize = require('../utils/normalize');
const WorkingState = require('./workingState');
const Branch = require('./branch');
const Cache = require('./cache');

const DEFAULTS = {
    currentBranchName: null, // Current branch full name
    workingStates: new Map(), // Map<String, WorkingState> indexed by local branch fullnames
    branches: new List(), // List<Branch>
    cache: new Cache()
};

/**
 * Repository represents a map of WorkingTree with a current active
 * one
 * @type {Class}
 */
class RepositoryState extends Record(DEFAULTS) {
    // ---- Properties Getter ----

    /**
     * @return {String} Current branch fullname
     */
    getCurrentBranchName() {
        return this.get('currentBranchName');
    }

    getWorkingStates() {
        return this.get('workingStates');
    }

    getBranches() {
        return this.get('branches');
    }

    getCache() {
        return this.get('cache');
    }

    // ---- Methods ----

    /**
     * Return a branch by its name
     * @param {String}
     * @return {Branch | Null}
     */
    getBranch(branchName) {
        const branch = this.getBranches()
                .find(function(_branch) {
                    return branchName == _branch.getFullName();
                });
        return branch || null;
    }

    /**
     * Return all local branches
     * @return {List<Branch>}
     */
    getLocalBranches() {
        return this.getBranches().filter(
            function onlyLocal(branch) {
                return !branch.isRemote();
            }
        );
    }

    /**
     * Return current active branch
     * @return {Branch | Null}
     */
    getCurrentBranch() {
        return this.getBranch(this.getCurrentBranchName());
    }

    /**
     * Return working state for the current branch
     * @return {WorkingState}
     */
    getCurrentState() {
        const currentBranch = this.getCurrentBranch();
        if (currentBranch === null) {
            return WorkingState.createEmpty();
        } else {
            return this.getWorkingStateForBranch(currentBranch);
        }
    }

    /**
     * Returns working state for given branch
     * @param {Branch}
     * @return {WorkingState | Null}
     */
    getWorkingStateForBranch(branch) {
        const states = this.getWorkingStates();
        return states.get(branch.getFullName()) || null;
    }

    /**
     * Check if a branch exists with the given name
     * @param {String} fullname Such as 'origin/master' or 'develop'
     */
    hasBranch(fullname) {
        return this.getBranches().some(function(branch) {
            return branch.getFullName() === fullname;
        });
    }

    /**
     * Check that a branch has been fetched
     * @param {Branch}
     */
    isFetched(branch) {
        return this.getWorkingStates().has(branch.getFullName());
    }

    /**
     * @param {Branch | String} branchName Branch to update
     * @param {Branch | Null} value New branch value, null to delete
     */
    updateBranch(branchName, value) {
        branchName = Normalize.branchName(branchName);

        let branches = this.getBranches();
        const index = branches.findIndex(function(branch) {
            return branch.getFullName() === branchName;
        });
        if (value === null) {
            // Delete
            branches = branches.remove(index);
        } else {
            // Update
            branches = branches.set(index, value);
        }
        return this.set('branches', branches);
    }
}

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
RepositoryState.encode = function(repoState) {
    return {
        currentBranchName: repoState.get('currentBranchName'),
        workingStates: repoState.get('workingStates').map(WorkingState.encode).toJS(),
        branches: repoState.get('branches').map(Branch.encode).toJS()
    };
};

RepositoryState.decode = function(json) {
    const workingStates = new Map(modifyValues(json.workingStates, WorkingState.decode));
    const branches = new List(json.branches.map(Branch.decode));

    return new RepositoryState({
        currentBranchName: json.currentBranchName,
        workingStates,
        branches
    });
};

module.exports = RepositoryState;
