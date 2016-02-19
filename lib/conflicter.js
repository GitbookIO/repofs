// Handles conflict handling logic

var _ = require('lodash');
var arrayBuffer = require('./utils/arraybuffer');

var REFS = {
    AHEAD: 'ahead',
    BEHIND: 'behind',
    DIVERGED: 'diverged',
    IDENTICAL: 'identical'
};

var FILE = {
    ABSENT_FROM_HEAD: 'absent-from-head',
    ABSENT_FROM_BASE: 'absent-from-base',
    BOTH_MODIFIED: 'both-modified',
    UNCHANGED: 'unchanged'
};

module.exports = {
    REFS: REFS,
    FILE: FILE,
    listConflicts: listConflicts,
    mergeInTree: mergeInTree
};


// Returns an object map containing all conflicting path present in the trees'
// entries. Each key contains conflict info.
// {
//   <path1>: {
//       status: conflict.FILE
//       path: '<path1>'
//       base: sha | null
//       head: sha | null
//   }
//   <path2>: ...
// }
// When a path only exists on one branch the respective base/head sha is
// null. Pass options `stripe` to false to keep unchanged entries.
function listConflicts(baseTreeEntries, headTreeEntries, opts) {
    opts = _.defaults(opts || {}, {
        stripe: true
    });
    var stripe = opts.stripe;

    var conflicts = {};
    _.forEach(baseTreeEntries, function (entry) {
        conflicts[entry.path] = { base: entry.sha };
    });
    _.forEach(headTreeEntries, function (entry) {
        var conflict = conflicts[entry.path];
        if (conflict === undefined) {
            conflicts[entry.path] = { head: entry.sha };
        } else if (stripe && conflict.base === entry.sha) {

            // No conflict
            delete conflicts[entry.path];
        } else {
            conflict.head = entry.sha;
        }
    });

    // `conflicts` is now a map of :
    // { path: { base, head } }
    // with at least base or head defined

    return _.mapValues(conflicts, function (conflict, path) {
        var status;
        if (conflict.base && !conflict.head) {
            status = FILE.ABSENT_FROM_HEAD;
        } else if (!conflict.base && conflict.head) {
            status = FILE.ABSENT_FROM_BASE;
        } else if (conflict.base !== conflict.head) {
            status = FILE.BOTH_MODIFIED;
        } else {
            status = FILE.UNCHANGED;
        }

        return _.defaults(conflict, {
            path: path,
            status: status,
            base: null,
            head: null
        });
    });
}

// Returns the result of merging the solved conflicts back into a
// tree. Encodes the entries' buffers in base64 and adds their size.
function mergeInTree(resolved, tree) {
    var normConflicts = _.mapValues(resolved.conflicts, function(entry) {
        return {
            path: entry.path,
            buffer: arrayBuffer.enforceBase64(entry.buffer),
            size: _.size(entry.buffer)
        };
    });
    var mergedEntries = _.defaults(normConflicts, tree.entries);
    var mergedTree = _.extend({}, tree, {entries: mergedEntries});
    return mergedTree;
}
