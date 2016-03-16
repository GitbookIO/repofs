var immutable = require('immutable');

var CONFLICT_STATUS = require('../constants/conflictStatus');

var Conflict = immutable.Record({
    status: CONFLICT_STATUS.IDENTICAL,

    // Blob SHA in the head
    head: String(),

    // Blob SHA in the base
    base: String()
});

// ---- Properties Getter ----
Conflict.prototype.getStatus = function() {
    return this.get('status');
};

module.exports = Conflict;
