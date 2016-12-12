const { Record, Map, OrderedMap } = require('immutable');

const modifyValues = require('modify-values');
const TreeEntry = require('./treeEntry');
const Change = require('./change');

const DEFAULTS = {
    head: String(), // SHA
    treeEntries: new Map(), // Map<Path, TreeEntry>
    changes: new OrderedMap() // OrderedMap<Path, Change>
};

/**
 * @type {Class}
 */
class WorkingState extends Record(DEFAULTS) {
    // ---- Properties Getter ----

    getTreeEntries() {
        return this.get('treeEntries');
    }

    getChanges() {
        return this.get('changes');
    }

    getHead() {
        return this.get('head');
    }

    // ---- Methods ----

    /**
     * Return true if working directory has no changes
     */
    isClean() {
        return this.getChanges().size == 0;
    }

    /**
     * Return a change for a specific path
     * @return {Change}
     */
    getChange(filePath) {
        const changes = this.getChanges();
        return changes.get(filePath);
    }

    /**
     * Return this working state as clean.
     * @return {WorkingState}
     */
    asClean(filePath) {
        return this.set('changes', new OrderedMap());
    }
}

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
    const treeEntries = new Map(modifyValues(json.treeEntries, TreeEntry.decode));
    const changes = new OrderedMap(modifyValues(json.changes, Change.decode));

    return new WorkingState({
        head: json.head,
        treeEntries,
        changes
    });
};

module.exports = WorkingState;
