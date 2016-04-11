var immutable = require('immutable');

var STATUSES = {
    ABSENT_FROM_HEAD: 'absent-from-head',
    ABSENT_FROM_BASE: 'absent-from-base',
    BOTH_MODIFIED: 'both-modified',
    UNCHANGED: 'unchanged'
};

var Conflict = immutable.Record({
    // See Conflict.STATUSES
    status: STATUSES.BOTH_MODIFIED,

    // Blob SHA in head. Null when non existant.
    headSha: null, // String

    // Blob SHA in base. Null when non existant.
    baseSha: null, // String

    // Is solved ?
    solved: false,

    // The SHA it is solved with. null when using solvedContent, or to solve by
    // deleting the entry.
    solvedSha: null, // SHA

    // The solved content
    solvedContent: null // Blob
});

// ---- Properties Getter ----
Conflict.prototype.getStatus = function() {
    // TODO
};

Conflict.STATUSES = STATUSES;
module.exports = Conflict;
