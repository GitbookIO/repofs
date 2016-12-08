var Immutable = require('immutable');
var Q = require('q');

var CommitBuilder = require('../models/commitBuilder');
var TreeEntry = require('../models/treeEntry');
var Branch = require('../models/branch');
var Conflict = require('../models/conflict');
var TreeConflict = require('../models/treeConflict');
var WorkingState = require('../models/workingState');

/**
 * Computes a TreeConflict between to tree references. Fetches the
 * trees from the repo. The list of conflicts is the minimal set of
 * conflicts.
 * @param {Driver} driver
 * @param {Branch | String} base A branch, branch name, or SHA
 * @param {Branch | String} head A branch, branch name, or SHA
 * @return {Promise<TreeConflict>}
 */
function compareRefs(driver, base, head) {
    var baseRef = base instanceof Branch ? base.getFullName() : base;
    var headRef = head instanceof Branch ? head.getFullName() : head;

    return driver.findParentCommit(baseRef, headRef)
    .then(function (parentCommit) {
        // There can be no parent commit
        return Q.all([
            parentCommit ? parentCommit.getSha() : null,
            baseRef,
            headRef
        ].map(function (ref) {
            return ref ? driver.fetchWorkingState(ref) : WorkingState.createEmpty();
        }));
    })
    .spread(function(parent, base, head) {
        var conflicts = _compareTrees(parent.getTreeEntries(),
                                     base.getTreeEntries(),
                                     head.getTreeEntries());

        return new TreeConflict({
            base: base,
            head: head,
            parent: parent,
            conflicts: conflicts
        });
    });
}

/**
 * Merge solved Conflicts back into a TreeConflict. Unsolved conflicts
 * default to keep base.
 * @param {TreeConflict} treeConflict
 * @param {Map<Path, Conflict>} solved
 * @return {TreeConflict}
 */
function solveTree(treeConflict, solved) {
    solved = treeConflict.getConflicts()
    .merge(solved)
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
 * @param {Array<SHA>} parents Parent commits
 * @param {Author} options.author
 * @param {String} [options.message='Merge commit']
 * @return {CommitBuilder}
 */
function mergeCommit(treeConflict, parents, options) {
    options = options || {};

    var opts = {};

    // Assume the commit is not empty
    opts.empty = false;

    // Parent SHAs
    opts.parents = new Immutable.List(parents);

    opts.author = options.author;
    opts.message = options.message || 'Merged commit';

    // Get the solved tree entries
    var solvedEntries = _getSolvedEntries(treeConflict);
    opts.treeEntries = solvedEntries;

    // Create map of blobs that needs to be created
    var solvedConflicts = treeConflict.getConflicts();
    opts.blobs = solvedEntries.filter(function (treeEntry) {
        return !treeEntry.hasSha();
    }).map(function (treeEntry, path) {
        return solvedConflicts.get(path).getSolvedContent();
    });

    return CommitBuilder.create(opts);
}

// ---- Auxiliaries ----

/**
 * @param {Map<Path, TreeEntry>} parentEntries
 * @param {Map<Path, TreeEntry>} baseEntries
 * @param {Map<Path, TreeEntry>} headEntries
 * @return {Map<Path, Conflict>} The minimal set of conflicts.
 */
function _compareTrees(parentEntries, baseEntries, headEntries) {
    var headDiff = _diffEntries(parentEntries, headEntries);
    var baseDiff = _diffEntries(parentEntries, baseEntries);

    // Conflicting paths are paths...
    // ... modified by both branches
    var headSet = Immutable.Set.fromKeys(headDiff);
    var baseSet = Immutable.Set.fromKeys(baseDiff);
    var conflictSet = headSet.intersect(baseSet).filter(function (filepath) {
        // ...in different manners
        return !Immutable.is(headDiff.get(filepath), baseDiff.get(filepath));
    });

    // Create the map of Conflict
    return (new Immutable.Map()).withMutations(function (map) {
        return conflictSet.reduce(function (map, filepath) {
            var shas = [
                parentEntries,
                baseEntries,
                headEntries
            ].map(function getSha(entries) {
                if (!entries.has(filepath)) return null;
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
function _diffEntries(parent, child) {
    var parentKeys = Immutable.Set.fromKeys(parent);
    var childKeys = Immutable.Set.fromKeys(child);
    var all = parentKeys.union(childKeys);

    var changes = all.filter(function hasChanged(path) {
        // Removed unchanged
        return !Immutable.is(parent.get(path), child.get(path));
    });

    return (new Immutable.Map()).withMutations(function (map) {
        return changes.reduce(function (map, path) {
            // Add new TreeEntry or null when deleted
            var treeEntry = child.get(path) || null;
            return map.set(path, treeEntry);
        }, map);
    });
}

/**
 * Returns the final TreeEntries for a solved TreeConflict.
 * @param {TreeConflict} treeConflict
 * @return {Map<Path, TreeEntry>} Some TreeEntries have a null SHA
 * because of new solved content.
 */
function _getSolvedEntries(treeConflict) {
    var parentEntries = treeConflict.getParent().getTreeEntries();
    var baseEntries = treeConflict.getBase().getTreeEntries();
    var headEntries = treeConflict.getHead().getTreeEntries();

    var baseDiff = _diffEntries(parentEntries, baseEntries);
    var headDiff = _diffEntries(parentEntries, headEntries);

    var resolvedEntries = treeConflict.getConflicts().map(function (solvedConflict) {
        // Convert to TreeEntries (or null for deletion)
        if(solvedConflict.isDeleted()) {
            return null;
        } else {
            return new TreeEntry({
                sha: solvedConflict.getSolvedSha() || null
            });
        }
    });

    return parentEntries.merge(baseDiff, headDiff, resolvedEntries)
    // Remove deleted entries
    .filter(function nonNull(entry) {
        return entry !== null;
    });
}

var ConflictUtils = {
    solveTree: solveTree,
    mergeCommit: mergeCommit,
    compareRefs: compareRefs,
    // Exposed for testing purpose
    _diffEntries: _diffEntries,
    _getSolvedEntries: _getSolvedEntries,
    _compareTrees: _compareTrees
};
module.exports = ConflictUtils;
