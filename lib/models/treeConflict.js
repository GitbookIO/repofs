var immutable = require('immutable');

var WorkingState = require('./workingState');

/**
 * A TreeConflict represents a comparison between two Git Trees
 */

var TreeConflict = immutable.Record({
    base: WorkingState.createEmpty(),
    head: WorkingState.createEmpty(),
    // Nearest parent
    parent: WorkingState.createEmpty(),

    // Map<Path, Conflict>
    conflicts: new immutable.Map()
}, 'TreeConflict');

// ---- Properties Getter ----
function getter(property) {
    return function () { return this.get(property); };
}
TreeConflict.prototype.getBase = getter('base');
TreeConflict.prototype.getHead = getter('head');
TreeConflict.prototype.getParent = getter('parent');
TreeConflict.prototype.getConflicts = getter('conflicts');

// ---- Methods ----

/**
 * Returns the status of the tree conflict. Possible values are
 * described in TreeConflict.STATUS.
 */
TreeConflict.prototype.getStatus = function () {
    var base = this.getBase().getHead();
    var head = this.getHead().getHead();
    var parent = this.getParent().getHead();

    if(base === head) {
        return TreeConflict.STATUS.IDENTICAL;
    } else if (base === parent) {
        return TreeConflict.STATUS.AHEAD;
    } else if (head === parent) {
        return TreeConflict.STATUS.BEHIND;
    } else {
        return TreeConflict.STATUS.DIVERGED;
    }
};

// ---- Static ----

TreeConflict.STATUS = {
    // Both trees are identical
    IDENTICAL: 'identical',
    // They both diverged from a common parent
    DIVERGED: 'diverged',
    // Base is a parent of head
    AHEAD: 'ahead',
    // Head is a parent of base
    BEHIND: 'behind'
};

module.exports = TreeConflict;
