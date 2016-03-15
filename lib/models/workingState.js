var util = require('util');
var immutable = require('immutable-js');

var Tree = require('./tree');
var Changes = require('./changes');
var Cache = require('./cache');

var WorkingStateRecord = immutable.Record({
    tree: new Tree(),
    changes: new Changes(),
    cache: new Cache()
});

function WorkingState() {

}
util.inherits(WorkingState, WorkingStateRecord);

// ---- Properties Getter ----
WorkingState.prototype.getTree = function() {
    return this.get('tree');
};

WorkingState.prototype.getChanges = function() {
    return this.get('changes');
};

WorkingState.prototype.getCache = function() {
    return this.get('cache');
};

// ---- Methods ----

// Return true if working directory has no changes
WorkingState.prototype.isClean = function() {
    return this.getChanges().getCount() == 0;
};

// ---- Statics ----

// Create a new empty WorkingTree
WorkingState.createEmpty = function createEmpty() {
    return new WorkingState({});
};

// Create a new WorkingTree using a tree
WorkingState.createFromTree = function createFromTree(tree) {
    return new WorkingState({
        ref: tree.sha
    });
};

module.exports = WorkingState;
