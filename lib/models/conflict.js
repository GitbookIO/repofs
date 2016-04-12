var immutable = require('immutable');

var Blob = require('./blob');

var STATUSES = {
    ADDED: 'added',
    DELETED: 'deleted',
    IDENTICAL: 'identical',
    MODIFIED: 'modified'
};

var Conflict = immutable.Record({
    // Blob SHA in head. Null when absent
    headSha: null, // String

    // Blob SHA in base. Null when absent
    baseSha: null, // String

    // Blob SHA in the closest parent. Null when absent
    parentSha: null, // String

    // Is solved ?
    solved: false,

    // The SHA it is solved with. null when using solvedContent, or to solve by
    // deleting the entry.
    solvedSha: null, // SHA

    // The solved content
    solvedContent: null // Blob
});

// ---- Properties Getter ----

/**
 * @return {Conflict.STATUSES}
 */
Conflict.prototype.getBaseStatus = function () {
    return getStatus(this.getParentSha(), this.getBaseSha());
};

/**
 * @return {Conflict.STATUSES}
 */
Conflict.prototype.getHeadStatus = function () {
    return getStatus(this.getParentSha(), this.getHeadSha());
};

/**
 * @param {String} sha
 * @return {Conflict}
 */
Conflict.prototype.solveWithSha = function (sha) {
    return this.merge({
        solved: true,
        solvedSha: sha,
        solvedContent: null
    });
};

/**
 * @param {Blob | String} content
 * @return {Conflict}
 */
Conflict.prototype.solveWithContent = function (content) {
    var blob = blob instanceof Blob ? content : Blob.createFromString(content);
    return this.merge({
        solved: true,
        solvedSha: null,
        solvedContent: blob
    });
};

// ---- Static ----

Conflict.create = function (parentSha, baseSha, headSha) {
    return new Conflict({
        parentSha: baseSha,
        baseSha: baseSha,
        headSha: headSha
    });
};

// ---- utils ----

/**
 * @param {SHA | Null} parent
 * @param {SHA | Null} sha
 */
function getStatus(parent, sha) {
    if(parent === sha) {
        return STATUSES.IDENTICAL;
    } else if (parent === null) {
        return STATUSES.ADDED;
    } else if (sha === null) {
        return STATUSES.DELETED;
    } else {
        // Both are not null but different
        return STATUSES.MODIFIED;
    }
}

Conflict.STATUSES = STATUSES;
module.exports = Conflict;
