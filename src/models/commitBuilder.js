const { Record, List, Map } = require('immutable');
const Author = require('./author');

const DEFAULTS = {
    // Commiter / Author
    committer: new Author(),
    author: new Author(),

    // Message for the commit
    message: String(),

    // Does the commit bring any modification ?
    empty: true,

    // Parents
    parents: new List(), // List<SHA>

    // Tree entries
    treeEntries: new Map(), // Map<Path, TreeEntry>

    // New blobs to create
    blobs: new Map() // Map<Path, Blob>
};

/**
 * CommitBuilder instance are created before creating the new commit
 * using the driver.
 *
 * @type {Class}
 */
class CommitBuilder extends Record(DEFAULTS) {
    getMessage() {
        return this.get('message');
    }

    getParents() {
        return this.get('parents');
    }

    getAuthor() {
        return this.get('author');
    }

    getTreeEntries() {
        return this.get('treeEntries');
    }

    getBlobs() {
        return this.get('blobs');
    }

    getCommitter() {
        return this.get('committer');
    }

    /**
     * Returns true if the commit does not contain any change.
     */
    isEmpty() {
        return this.get('empty');
    }
}

// ---- Statics

/**
 * Create a commit builder from a definition
 * @return {CommitBuilder}
 */
CommitBuilder.create = function(opts) {
    opts.committer = opts.committer || opts.author;
    return new CommitBuilder(opts);
};

module.exports = CommitBuilder;
