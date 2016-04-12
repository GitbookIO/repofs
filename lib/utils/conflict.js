var immutable = require('immutable');
var Q = require('q');

var CommitBuilder = require('../models/commitBuilder');
var TreeEntry = require('../models/treeEntry');
var Branch = require('../models/branch');
var Conflict = require('../models/conflict');
var TreeConflict = require('../models/treeConflict');

/**
 * Computes a TreeConflict between to tree references. Fetches the trees
 * from the repo.
 * @param {Driver} driver
 * @param {Branch | SHA} base A branch or tree SHA
 * @param {Branch | SHA} head A branch or tree SHA
 * @return {Promise<TreeConflict>}
 */
function compareRefs(driver, base, head) {
    var baseRef = base instanceof Branch ? base.getFullName() : base;
    var headRef = head instanceof Branch ? head.getFullName() : head;

    return driver.findParentCommit(baseRef, headRef)
    .then(function (parentCommit) {
        return Q.all([
            parentCommit.getSha(),
            baseRef,
            headRef
        ].map(driver.fetchWorkingState));
    })
    .spread(function(parent, base, head) {
        var conflicts = compareTrees(parent.getEntries(),
                                     base.getEntries(),
                                     head.getEntries());

        return new TreeConflict({
            base: base,
            head: head,
            parent: parent,
            conflicts: conflicts
        });
    });
}

/**
 * @param {Map<Path, TreeEntry>} parentEntries
 * @param {Map<Path, TreeEntry>} baseEntries
 * @param {Map<Path, TreeEntry>} headEntries
 * @return {Map<Path, Conflict>}
 */
function compareTrees(parentEntries, baseEntries, headEntries) {
    var headDiff = diffEntries(parentEntries, baseEntries);
    var baseDiff = diffEntries(parentEntries, baseEntries);

    // Conflicting paths are paths...
    // ... modified by both branches
    var headSet = immutable.Set.fromKeys(headDiff);
    var baseSet = immutable.Set.fromKeys(baseDiff);
    var conflictSet = headSet.intersect(baseSet).filter(function (filepath) {
        // ...in different manners
        return !immutable.is(headDiff.get(filepath), baseDiff.get(filepath));
    });

    // Create the map of Conflict
    return new immutable.Map().withMutation(function (map) {
        return conflictSet.reduce(function (map, filepath) {
            var shas = [
                parentEntries,
                baseEntries,
                headEntries
            ].map(function getSha(entries) {
                return entries.get(filepath).getSha() || null;
            });

            return map.set(filepath, Conflict.create.apply(undefined, shas));
        }, map);
    });
}

/**
 * @param {Map<Path, TreeEntry>} parent
 * @param {Map<Path, TreeEntry>} child
 * @return {Map<Path, TreeEntry | Null>} The set of Path that have
 * been modified by the child. Null entries mean deletion.
 */
function diffEntries(parent, child) {
    var parentKeys = immutable.Set.fromKeys(parent);
    var childKeys = immutable.Set.fromKeys(child);
    var all = parentKeys.union(childKeys);

    var changes = all.filter(function isUnchanged(path) {
        // Removed unchanged
        return immutable.is(parent.get(path), child.get(path));
    });

    return new immutable.Map().withMutation(function (map) {
        return changes.reduce(function (map, path) {
            // Add new TreeEntry or null when deleted
            var treeEntry = child.get(path) || null;
            return map.set(path, treeEntry);
        }, map);
    });
}

/**
 * Merge solved Conflicts back into a TreeConflict.
 * @param {TreeConflict} treeConflict
 * @param {Map<Path, Conflict>} solved
 * @return {TreeConflict}
 */
function getSolvedTree(treeConflict, solved) {
    solved = treeConflict.getConflicts()
    .concat(solved)
    // Solve unresolved conflicts
    .map(function defaultSolve(conflict) {
        if(!conflict.isSolved()) {
            return conflict.keepBase();
        } else {
            return conflict;
        }
    });
    return treeConflict.set('conflicts', solved);
}


/**
 * Create a merge commit builder
 * @param {TreeConflict} treeConflict The solved TreeConflict
 * @param {Array<SHA>} options.parents Required. Parent commits
 * @param {Author} [options.author]
 * @param {String} [options.message]
 * @return {CommitBuilder}
 */
function mergeCommit(treeConflict, options) {
    options = options || {};

    var opts = {};


    // Parent SHAs
    opts.parents = new immutable.List(options.parents);

    opts.author = options.author;
    opts.message = options.message || 'Merged commit';

    // Get the solved tree entries
    opts.treeEntries = getSolvedEntries(treeConflict);

    // Create map of blobs that needs to be created
    var solved = treeConflict.getConflicts();
    opts.blobs = opts.treeEntries.filter(function (treeEntry) {
        return !treeEntry.hasSha();
    }).map(function (treeEntry, path) {
        return solved.get(path).getContent();
    });

    return new CommitBuilder(opts);
}

/**
 * Returns the final TreeEntries for a solved TreeConflict.
 * @param {TreeConflict} treeConflict
 * @return {Map<Path, TreeEntry>}
 */
function getSolvedEntries(treeConflict) {
    var parentEntries = treeConflict.getParent().getTreeEntries();
    var baseEntries = treeConflict.getBase().getTreeEntries();
    var headEntries = treeConflict.getHead().getTreeEntries();

    var baseDiff = diffEntries(parentEntries, baseEntries);
    var headDiff = diffEntries(parentEntries, headEntries);

    var resolvedEntries = treeConflict.getConflicts().map(function (conflict) {
        // Convert to TreeEntries (or null for deletion)
        if(conflict.isDeleted()) {
            return null;
        } else {
            return new TreeEntry({
                sha: conflict.hasSha() ? conflict.getSha() : null
            });
        }
    });

    return parentEntries.merge(baseDiff, headDiff, resolvedEntries)
    // Remove deleted entries
    .filter(function nonNull(entry) {
        return entry !== null;
    });
}

module.exports = {
    getSolvedTree: getSolvedTree,
    mergeCommit: mergeCommit,
    compareRefs: compareRefs
};
