var immutable = require('immutable');

/**
 * A TreeConflict represents a comparison between two Git Trees
 */

var TreeConflict = immutable.Record({
    // SHA of the base tree
    baseSha: null,
    // SHA of the head tree
    headSha: null,
    // Nearest parent tree SHA
    parentSha: null,

    // Map<Path, TreeEntry>
    baseEntries: new immutable.Map(),
    // Map<Path, TreeEntry>
    headEntries: new immutable.Map(),
    // Nearest parent tree entries
    parentEntries: new immutable.Map(),

    // Map<Path, Conflict>
    conflicts: new immutable.Map()
});

// ---- Properties Getter ----

// ---- Methods ----

/**
 * Returns the status of the tree conflict. Possible values are
 * described in TreeConflict.STATUSES.
 */
TreeConflict.prototype.getStatus = function () {
    var base = this.getBaseSha();
    var head = this.getHeadSha();
    var parent = this.getParentSha();

    if(base === head) {
        return TreeConflict.STATUSES.IDENTICAL;
    } else if (parent === base) {
        return TreeConflict.STATUSES.AHEAD;
    } else if (parent === head) {
        return TreeConflict.STATUSES.BEHIND;
    } else {
        return TreeConflict.STATUSES.DIVERGED;
    }
};

// ---- Static ----

TreeConflict.STATUSES = {
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
