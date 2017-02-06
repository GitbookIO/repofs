const { Record, List } = require('immutable');
const Author = require('./author');
const FileDiff = require('./fileDiff');

/**
 * Represents a Commit in the history (already created)
 */

const DEFAULTS = {
    // Message for the commit
    message: String(),
    // SHA of the commit
    sha:     String(),
    // Author name
    author:  new Author(),
    // String formatted date of the commit
    date:    String(),
    // List of files modified with their SHA and patch.
    files:   List(), // List<FileDiff>
    // Parents of the commit (List<SHA>)
    parents: List()
};

/**
 * A Change represents a local modification, not yet commited.
 * @type {Class}
 */
class Commit extends Record(DEFAULTS) {
    getMessage() {
        return this.get('message');
    }

    getSha() {
        return this.get('sha');
    }

    getAuthor() {
        return this.get('author');
    }

    getDate() {
        return this.get('date');
    }

    getFiles() {
        return this.get('files');
    }

    getParents() {
        return this.get('parents');
    }

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
    static create(opts) {
        if (opts instanceof Commit) {
            return opts;
        }

        return new Commit({
            sha: opts.sha,
            message: opts.message,
            author: opts.author,
            date: opts.date,
            files: List(opts.files).map(file => FileDiff.create(file)),
            parents: List(opts.parents)
        });
    }

    static encode(commit) {
        const { message, sha, date, author, parents } = commit;

        return {
            message,
            sha,
            date,
            parents: parents.toJS(),
            author: Author.encode(author)
        };
    }

    static decode(json) {
        return Commit.create(json);
    }
}

module.exports = Commit;
