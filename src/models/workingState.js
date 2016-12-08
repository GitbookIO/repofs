const _ = require('lodash');
const Immutable = require('immutable');

const TreeEntry = require('./treeEntry');
const Change = require('./change');

const WorkingState = Immutable.Record({
    head: String(), // SHA
    treeEntries: new Immutable.Map(), // Map<Path, TreeEntry>
    changes: new Immutable.OrderedMap() // OrderedMap<Path, Change>
}, 'WorkingState');

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

/**
 * Return true if working directory has no changes
 */
WorkingState.prototype.isClean = function() {
    return this.getChanges().size == 0;
};

/**
 * Return a change for a specific path
 * @return {Change}
 */
WorkingState.prototype.getChange = function(filePath) {
    const changes = this.getChanges();
    return changes.get(filePath);
};

/**
 * Return this working state as clean.
 * @return {WorkingState}
 */
WorkingState.prototype.asClean = function(filePath) {
    return this.set('changes', new Immutable.OrderedMap());
};

// ---- Statics ----

/**
 * Create a new empty WorkingState
 */
WorkingState.createEmpty = function createEmpty() {
    return new WorkingState({});
};

/**
 * Create a clean WorkingState from a head SHA and a map of tree entries
 * @param {SHA} head
 * @param {Map<Path, TreeEntry>} treeEntries
 * @return {WorkingState}
 */
WorkingState.createWithTree = function(head, treeEntries) {
    return new WorkingState({
        head,
        treeEntries
    });
};

WorkingState.encode = function(workingState) {
    return {
        head: workingState.get('head'),
        treeEntries: workingState.get('treeEntries').map(TreeEntry.encode).toJS(),
        changes: workingState.get('changes').map(Change.encode).toJS()
    };
};

WorkingState.decode = function(json) {
    const treeEntries = new Immutable.Map(_.mapValues(json.treeEntries, TreeEntry.decode));
    const changes = new Immutable.OrderedMap(_.mapValues(json.changes, Change.decode));

    return new WorkingState({
        head: json.head,
        treeEntries,
        changes
    });
};

module.exports = WorkingState;
