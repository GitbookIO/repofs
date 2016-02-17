// Handles conflict handling logic

var _ = require('lodash');

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
    listConflicts: listConflicts
};


// Returns an object map containing every path present in the trees' entries. Each key contains conflict info
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
// null
function listConflicts(baseTreeEntries, headTreeEntries) {
    var conflicts = {};

    var storeSha = function (baseOrHead, entry) {
        var toAdd = _.set({}, baseOrHead, entry.sha); // { prop : sha }
        conflicts[entry.path] = _.extend(conflicts[entry.path] || {}, toAdd);
    };

    _.forEach(baseTreeEntries, _.partial(storeSha, 'base'));
    _.forEach(headTreeEntries, _.partial(storeSha, 'head'));

    // `conflicts` is now a map of :
    // { path: { base, head } }

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
