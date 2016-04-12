var immutable = require('immutable');

var Conflict = immutable.Record({
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

Conflict.create = function (baseSha, headSha) {
    return new Conflict({
        baseSha: baseSha,
        headSha: headSha
    });
};

module.exports = Conflict;
