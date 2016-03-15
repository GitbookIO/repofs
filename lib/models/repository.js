var util = require('util');
var immutable = require('immutable-js');

var WorkingState = require('./workingState');

/*
Repository represents a map of WorkingTree with a current active one
*/

var RepositoryRecord = immutable.Record({
    currentBranch: 'master',
    workingStates: new immutable.Map(WorkingState)
});

function Repository() {

}
util.inherits(Repository, RepositoryRecord);

// ---- Properties Getter ----
Repository.prototype.getCurrentBranch = function() {
    return this.get('currentBranch');
};

Repository.prototype.getWorkingStates = function() {
    return this.get('workingStates');
};

// ---- Methods ----

// Return current working state
Repository.prototype.getCurrent = function() {
    var states = this.getWorkingStates();
    var currentBranch = this.getCurrentBranch();

    return states.get(currentBranch);
};

module.exports = Repository;
