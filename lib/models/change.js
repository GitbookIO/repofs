var Buffer = require('buffer').Buffer;
var immutable = require('immutable');

var CHANGE_TYPE = require('../constants/changeType');

/*
A Change represents a local modification, not yet commited.
*/

var Change = immutable.Record({
    type: CHANGE_TYPE.UPDATE,

    // New content of the file (for a CREATE/UPDATE)
    content: new Buffer(''),

    // or sha of the origin (for a rename/move)
    sha: '',

    // Message to describe this change
    message: ''
});

// ---- Properties Getter ----
Change.prototype.getType = function() {
    return this.get('type');
};

Change.prototype.getContent = function() {
    return this.get('content');
};


module.exports = Change;
