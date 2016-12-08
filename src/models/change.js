const _ = require('lodash');

const Immutable = require('immutable');

const CHANGE_TYPE = require('../constants/changeType');
const Blob = require('./blob');

/**
 * A Change represents a local modification, not yet commited.
 */

const Change = Immutable.Record({
    type: CHANGE_TYPE.UPDATE,

    // New content of the file (for a CREATE/UPDATE)
    content: new Blob(),

    // or sha of the origin (for a rename/move)
    sha: null // String
}, 'Change');

const REMOVE = new Change({
    type: CHANGE_TYPE.REMOVE
});

// ---- Properties Getter ----
Change.prototype.getType = function() {
    return this.get('type');
};

Change.prototype.getSha = function() {
    return this.get('sha');
};

Change.prototype.hasSha = function() {
    return !!this.get('sha');
};

Change.prototype.getContent = function() {
    return this.get('content');
};

// ---- Static ----

/**
 * @param {Buffer | ArrayBuffer | String} content
 * @return {Change} CREATE with content and optional message
 */
Change.createCreate = function(content) {
    return new Change({
        type:    CHANGE_TYPE.CREATE,
        content: Blob.create(content)
    });
};

/**
 * @param {SHA} sha
 * @return {Change} CREATE with origin sha and optional message
 */
Change.createCreateFromSha = function(sha) {
    return new Change({
        type: CHANGE_TYPE.CREATE,
        sha
    });
};

/**
 * @param {Buffer | ArrayBuffer | String} content
 * @return {Change} UPDATE with content and optional message
 */
Change.createUpdate = function(content) {
    return new Change({
        type: CHANGE_TYPE.UPDATE,
        content: Blob.create(content)
    });
};

/**
 * @return {Change} REMOVE with optional message
 */
Change.createRemove = function() {
    return REMOVE;
};

Change.encode = function(change) {
    return {
        type: change.get('type'),
        // Encode Blob as base64 string
        content: change.get('content').getAsString('base64'),
        sha: change.get('sha')
    };
};

Change.decode = function(json) {
    // Useless optimization to use the original String reference
    const typeKey = _.findKey(CHANGE_TYPE, _.eq.bind(null, json.type));
    if (!typeKey) {
        throw new Error('Unrecognized change type');
    }
    const type = CHANGE_TYPE[typeKey];

    const content = Blob.createFromBase64(json.content);

    return new Change({
        type,
        content,
        sha: json.sha
    });
};

module.exports = Change;
