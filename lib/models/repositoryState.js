var util = require('util');
var immutable = require('immutable');

var Cache = require('./cache');

/*
Repository represents a map of WorkingTree with a current active one
*/

var RepositoryRecord = immutable.Record({
    currentBranch: 'master',
    workingStates: new immutable.Map(),
    branches: new immutable.OrderedMap(),
    cache: new Cache()
});

function RepositoryState() {

}
util.inherits(RepositoryState, RepositoryRecord);

// ---- Properties Getter ----
RepositoryState.prototype.getCurrentBranch = function() {
    return this.get('currentBranch');
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

// Return current working state
RepositoryState.prototype.getCurrentState = function() {
    var states = this.getWorkingStates();
    var currentBranch = this.getCurrentBranch();

    return states.get(currentBranch);
};

// ---- Statics ----

// Create a new empty WorkingTree
RepositoryState.createEmpty = function createEmpty() {
    return new RepositoryState({});
};


module.exports = RepositoryState;
