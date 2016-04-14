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

function getter(property) {
    return function () { return this.get(property); };
}
Conflict.prototype.getBaseSha = getter('baseSha');
Conflict.prototype.getHeadSha = getter('headSha');
Conflict.prototype.getParentSha = getter('parentSha');
Conflict.prototype.isSolved = getter('solved');
Conflict.prototype.getSolvedSha = getter('solvedSha');
Conflict.prototype.getSolvedContent = getter('solvedContent');

// ---- Methods ----

/**
 * @return {Boolean}
 */
Conflict.prototype.isDeleted = function () {
    return this.isSolved()
        && this.getSolvedContent() === null
        && this.getSolvedSha() === null;
};

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

/**
 * @return {Conflict} Solved by removing the entry
 */
Conflict.prototype.solveByDeletion = function () {
    return this.merge({
        solved: true,
        solvedSha: null,
        solvedContent: null
    });
};

/**
 * @return {Conflict} Solved by keeping head's version
 */
Conflict.prototype.keepHead = function (content) {
    return this.solveWithSha(this.getHeadSha());
};

/**
 * @return {Conflict} Solved by keeping base's version
 */
Conflict.prototype.keepBase = function (content) {
    return this.solveWithSha(this.getBaseSha());
};

/**
 * @return {Conflict} Reset to unsolved state
 */
Conflict.prototype.unsolve = function () {
    return this.merge({
        solved: false,
        solvedSha: null,
        solvedContent: null
    });
};

// ---- Static ----

Conflict.create = function (parentSha, baseSha, headSha) {
    return new Conflict({
        parentSha: parentSha,
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
