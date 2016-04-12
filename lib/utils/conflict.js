var immutable = require('immutable');
var _ = require('lodash');
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
    var headModif = modifiedSet(parentEntries, baseEntries);
    var baseModif = modifiedSet(parentEntries, baseEntries);

    var conflictSet = headModif.intersect(baseModif);

    return new immutable.Map().withMutation(function (map) {
        return conflictSet.reduce(function (filepath) {
            var baseSha = baseEntries.get(filepath).getSha() || null;
            var headSha = headEntries.get(filepath).getSha() || null;
            return Conflict.create(baseSha, headSha);
        });
    });
}


/**
 * @param {Map<Path, TreeEntry>} parent
 * @param {Map<Path, TreeEntry>} child
 * @return {Set<Path>} The set of Path that have been modified between
 */
function modifiedSet(parent, child) {
    var parentKeys = immutable.Set.fromKeys(parent);
    var childKeys = immutable.Set.fromKeys(child);

    var common = parentKeys.intersect(childKeys);
    var unchanged = common.filter(function (path) {
        return parent.get(path).getSha()
            === child.get(path).getSha();
    });

    var all = parentKeys.union(childKeys);
    return all.subtract(unchanged);
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
 * @param {Map<Path, TreeEntry>}
 * @return {Map<Path, TreeEntry>}
 */
function getSolvedEntries(treeConflict) {
// TODO
}

module.exports = {
    getSolvedTree: getSolvedTree,
    mergeCommit: mergeCommit,
    compareRefs: compareRefs
};
