const { Record } = require('immutable');
const CHANGE_TYPE = require('../constants/changeType');
const Blob = require('./blob');

const DEFAULTS = {
    type:    CHANGE_TYPE.UPDATE,
    // New content of the file (for a CREATE/UPDATE)
    content: new Blob(),
    // or sha of the origin (for a rename/move)
    sha:     null // String
};

/**
 * A Change represents a local modification, not yet commited.
 * @type {Class}
 */
class Change extends Record(DEFAULTS) {

    // ---- Properties Getter ----
    getType() {
        return this.get('type');
    }

    getSha() {
        return this.get('sha');
    }

    hasSha() {
        return !!this.get('sha');
    }

    getContent() {
        return this.get('content');
    }

    // ---- Static ----

    /**
     * @param {Buffer | ArrayBuffer | String} content
     * @return {Change} CREATE with content and optional message
     */
    static createCreate(content) {
        return new Change({
            type:    CHANGE_TYPE.CREATE,
            content: Blob.create(content)
        });
    }

    /**
     * @param {SHA} sha
     * @return {Change} CREATE with origin sha and optional message
     */
    static createCreateFromSha(sha) {
        return new Change({
            type: CHANGE_TYPE.CREATE,
            sha
        });
    }

    /**
     * @param {Buffer | ArrayBuffer | String} content
     * @return {Change} UPDATE with content and optional message
     */
    static createUpdate(content) {
        return new Change({
            type: CHANGE_TYPE.UPDATE,
            content: Blob.create(content)
        });
    }

    /**
     * @return {Change} REMOVE with optional message
     */
    static createRemove() {
        return new Change({
            type: CHANGE_TYPE.REMOVE
        });
    }

    static encode(change) {
        return {
            type: change.get('type'),
            // Encode Blob as base64 string
            content: change.get('content').getAsString('base64'),
            sha: change.get('sha')
        };
    }

    static decode(json) {
        // Useless optimization to use the original String reference
        const type = CHANGE_TYPE[json.type.toUpperCase()];

        if (!type) {
            throw new Error('Unrecognized change type');
        }

        const content = Blob.createFromBase64(json.content);

        return new Change({
            type,
            content,
            sha: json.sha
        });
    }
}

module.exports = Change;
