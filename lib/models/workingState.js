var immutable = require('immutable');

var WorkingState = immutable.Record({
    head: String(),
    tree: new immutable.Map(),
    changes: new immutable.OrderedMap()
});

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
    return this.getChanges().size == 0;
};

// Return commit message
WorkingState.prototype.getCommitMessage = function() {
    var changes = this.getChanges();
    var lastChange = changes.last();
    if (!lastChange) return null;

    return lastChange.message;
};

// Return a change for a specific path
WorkingState.prototype.getChange = function(filePath) {
    var changes = this.getChanges();
    return changes.get(filePath);
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
