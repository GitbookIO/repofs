var util = require('util');
var immutable = require('immutable-js');

var CHANGETYPE = require('../constants/changeType');

/*
A Change represents a local modification, not yet commited.
*/

var ChangeRecord = immutable.Record({
    type: CHANGETYPE.UPDATE,
    content: ''
});

function Change() {

}
util.inherits(Change, ChangeRecord);

// ---- Properties Getter ----
Change.prototype.getType = function() {
    return this.get('type');
};

Change.prototype.getContent = function() {
    return this.get('content');
};


module.exports = Change;
