var _ = require('lodash');
var immutable = require('immutable');

var TreeEntry = require('./treeEntry');
var Change = require('./change');

var WorkingState = immutable.Record({
    head: String(), // SHA
    treeEntries: new immutable.Map(), // Map<Path, TreeEntry>
    changes: new immutable.OrderedMap() // OrderedMap<Path, Change>
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

WorkingState.encode = function (workingState) {
    return {
        head: workingState.get('head'),
        treeEntries: workingState.get('treeEntries').map(TreeEntry.encode).toJS(),
        changes: workingState.get('branches').map(Change.encode).toJS()
    };
};

WorkingState.decode = function (json) {
    var treeEntries = new immutable.Map(_.map(json.tree, TreeEntry.decode));
    var changes = new immutable.OrderedMap(_.map(json.changes, Change.decode));

    return new WorkingState({
        head: json.head,
        treeEntries: treeEntries,
        changes: changes
    });
};

module.exports = WorkingState;
