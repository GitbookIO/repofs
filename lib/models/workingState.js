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

    // TODO generate default message if absent
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

WorkingState.encode = function (workingState) {
    return {
        head: workingState.get('head'),
        treeEntries: workingState.get('treeEntries').map(TreeEntry.encode).toJS(),
        changes: workingState.get('changes').map(Change.encode).toJS()
    };
};

WorkingState.decode = function (json) {
    var treeEntries = new immutable.Map(_.mapValues(json.treeEntries, TreeEntry.decode));
    var changes = new immutable.OrderedMap(_.mapValues(json.changes, Change.decode));

    return new WorkingState({
        head: json.head,
        treeEntries: treeEntries,
        changes: changes
    });
};

module.exports = WorkingState;
