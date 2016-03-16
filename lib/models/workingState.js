var immutable = require('immutable');

var WorkingState = immutable.Record({
    head: String(), // SHA
    treeEntries: new immutable.Map(), // Map<Path, TreeEntry>
    changes: new immutable.OrderedMap() // Map<Path, Change>
});

// ---- Properties Getter ----
WorkingState.prototype.getTreeEntries = function() {
    return this.get('treeEntries');
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
// @return {Change}
WorkingState.prototype.getChange = function(filePath) {
    var changes = this.getChanges();
    return changes.get(filePath);
};

// ---- Statics ----

// Create a new empty WorkingTree
WorkingState.createEmpty = function createEmpty() {
    return new WorkingState({});
};

// Create a new WorkingTree with a given initial tree
// @param {SHA}
// @param {Map<Path, TreeEntry>}
// @return {WorkingState}
WorkingState.createWithTree = function createWithTree(headSha, treeEntries) {
    return new WorkingState({
        head: headSha,
        treeEntries: treeEntries
    });
};

module.exports = WorkingState;
