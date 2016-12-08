var Immutable = require('immutable');

var Author = require('./author');

/**
 * Represents a Commit in the history (already created)
 */

var Commit = Immutable.Record({
    // Message for the commit
    message: String(),

    // SHA of the commit
    sha: String(),

    // Author name
    author: new Author(),

    // String formatted date of the commit
    date: String(),

    // List of files modified with their SHA and patch.
    // File: {
    //   sha: '...',
    //   filename: README.md,
    //   status: modified,
    //   additions: 2,
    //   deletions: 0,
    //   changes: 2,
    //   patch: ''
    // }
    files: new Immutable.List(), // List<JSON>

    // Parents of the commit (List<SHA>)
    parents: new Immutable.List()
}, 'Commit');

// ---- Properties Getter ----

function getter(property) {
    return function () { return this.get(property); };
}
Commit.prototype.getMessage = getter('message');
Commit.prototype.getSha = getter('sha');
Commit.prototype.getAuthor = getter('author');
Commit.prototype.getDate = getter('date');
Commit.prototype.getFiles = getter('files');
Commit.prototype.getParents = getter('parents');

// ---- Statics

/**
 * @param {SHA} opts.sha
 * @param {Array<SHA>} opts.parents
 * @param {String} [opts.message]
 * @param {String} [opts.date]
 * @param {Author} [opts.author]
 * @param {Array<JSON>} [opts.files] Modified files objects, as returned by the GitHub API
 * @return {Commit}
 */
Commit.create = function (opts) {
    return new Commit({
        sha: opts.sha,
        message: opts.message,
        author: opts.author,
        date: opts.date,
        files: new Immutable.List(opts.files),
        parents: new Immutable.List(opts.parents)
    });
};

module.exports = Commit;
