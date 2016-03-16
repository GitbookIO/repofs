var immutable = require('immutable');

var CONFLICTS_TYPE = require('../constants/conflictsType');

var ConflictState = immutable.Record({
    head: String(),
    base: String(),
    type: CONFLICTS_TYPE.IDENTICAL,
    files: new immutable.OrderedMap()
});

// ---- Properties Getter ----
ConflictState.prototype.getHead = function() {
    return this.get('head');
};

ConflictState.prototype.getBase = function() {
    return this.get('base');
};

module.exports = ConflictState;
