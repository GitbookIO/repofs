var immutable = require('immutable');

/**
 * Represents a Commit in the history (already created)
 */

var Commit = immutable.Record({
    // Message for the commit
    message: String(),

    // SHA of the commit
    sha: String(),

    // Parents of the commit (List<SHA>)
    parents: immutable.List()
});

// ---- Properties Getter ----
Commit.prototype.getMessage = function() {
    return this.get('message');
};

Commit.prototype.getSha = function() {
    return this.get('sha');
};

Commit.prototype.getParents = function() {
    return this.get('parents');
};

// ---- Statics

/**
 * @param {SHA} sha
 * @param {String} message
 * @param {Array<SHA>} parents
 * @return {Commit}
 */
Commit.create = function (sha, message, parents) {
    return new Commit({
        sha: sha,
        message: message,
        parents: new immutable.List(parents)
    });
};

Commit.encode = function (commit) {
    return {
        sha: commit.getSha(),
        message: commit.getMessage(),
        parents: commit.getParents().toJS()
    };
};

Commit.decode = function (json) {
    return new Commit({
        sha: json.sha,
        message: json.message,
        parents: new immutable.List(json.parents)
    });
};

module.exports = Commit;
