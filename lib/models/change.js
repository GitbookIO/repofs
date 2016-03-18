var _ = require('lodash');

var Buffer = require('buffer').Buffer;
var bufferUtil = require('../utils/arraybuffer');
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
    sha: '', // String

    // Message to describe this change. Change itself has not enough
    // info to provide appropriate default messages. @see ChangeUtils
    message: null // String
});

var REMOVE = new Change({
    type: CHANGE_TYPE.REMOVE
});

// ---- Properties Getter ----
Change.prototype.getType = function() {
    return this.get('type');
};

Change.prototype.getSha = function() {
    return this.get('sha');
};

Change.prototype.getContent = function() {
    return this.get('content');
};


// ---- Static ----


// @param {Buffer | ArrayBuffer | String} content
// @param {String} message (optional)
// @return {Change} CREATE with content and optional message
Change.createCreate = function (content, message) {
    return new Change({
        type: CHANGE_TYPE.CREATE,
        content: bufferUtil.enforceBuffer(content),
        message: message
    });
};

// @param {SHA} sha
// @param {String} message (optional)
// @return {Change} CREATE with origin sha and optional message
Change.createCreateFromSha = function (sha, message) {
    return new Change({
        type: CHANGE_TYPE.CREATE,
        sha: sha,
        message: message
    });
};

// @param {Buffer | ArrayBuffer | String} content
// @param {String} message (optional)
// @return {Change} UPDATE with content and optional message
Change.createUpdate = function (content, message) {
    return new Change({
        type: CHANGE_TYPE.UPDATE,
        content: bufferUtil.enforceBuffer(content),
        message: message
    });
};

// @param {String} message (optional)
// @return {Change} REMOVE with optional message
Change.createRemove = function (message) {
    if(message === undefined) {
        return REMOVE;
    } else {
        return REMOVE.set('message', message);
    }
};

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
