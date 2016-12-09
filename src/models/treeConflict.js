const { Record, Map } = require('immutable');

const WorkingState = require('./workingState');

const DEFAULTS = {
    base: WorkingState.createEmpty(),
    head: WorkingState.createEmpty(),
    // Nearest parent
    parent: WorkingState.createEmpty(),

    // Map<Path, Conflict>
    conflicts: new Map()
};

/**
 * A TreeConflict represents a comparison between two Git Trees
 * @type {Class}
 */
class TreeConflict extends Record(DEFAULTS) {
    // ---- Properties Getter ----

    getBase() {
        return this.get('base');
    }

    getHead() {
        return this.get('head');
    }

    getParent() {
        return this.get('parent');
    }

    getConflicts() {
        return this.get('conflicts');
    }

    // ---- Methods ----

    /**
     * Returns the status of the tree conflict. Possible values are
     * described in TreeConflict.STATUS.
     */
    getStatus() {
        const base = this.getBase().getHead();
        const head = this.getHead().getHead();
        const parent = this.getParent().getHead();

        if (base === head) {
            return TreeConflict.STATUS.IDENTICAL;
        } else if (base === parent) {
            return TreeConflict.STATUS.AHEAD;
        } else if (head === parent) {
            return TreeConflict.STATUS.BEHIND;
        } else {
            return TreeConflict.STATUS.DIVERGED;
        }
    }
}

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
