var _ = require('lodash');

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


// ---- Static ----

Change.encode = function (change) {
    return {
        type: change.get('type'),
        // Encode Buffer as base64 string
        content: change.get('content').toString('base64'),
        sha: change.get('sha'),
        message: change.get('message')
    };
};

Change.decode = function (json) {
    // Useless optimization to use the original String reference
    var typeKey = _.findKey(CHANGE_TYPE, _.eq.bind(null, json.type));
    if(!typeKey) {
        throw new Error('Unrecognized change type');
    }
    var type = CHANGE_TYPE[typeKey];

    var content = new Buffer(json.content, 'base64');

    return new Change({
        type: type,
        content: content,
        sha: json.sha,
        message: json.message
    });
};

module.exports = Change;
