var util = require('util');
var immutable = require('immutable-js');

var TreeEntry = require('./treeEntry');
var Changes = require('./changes');

var WorkingStateRecord = immutable.Record({
    head: String(),
    tree: new immutable.Map(TreeEntry),
    changes: new Changes()
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

WorkingState.prototype.getHead = function() {
    return this.get('head');
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

// Create a new WorkingTree using a tree result
WorkingState.createFromTree = function createFromTree(tree) {
    return new WorkingState({
        head: tree.sha,
        entries: tree.entries
    });
};

module.exports = WorkingState;
