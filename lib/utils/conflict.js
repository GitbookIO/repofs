var immutable = require('immutable');

var CommitBuilder = require('../models/commitBuilder');
var TreeEntry = require('../models/treeEntry');

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
    mergeCommit: mergeCommit
};
