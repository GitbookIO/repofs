const Immutable = require('immutable');

const Author = require('./author');

/**
 * CommitBuilder instance are created before creating the new commit
 * using the driver.
 */

const CommitBuilder = Immutable.Record({
    // Commiter / Author
    committer: new Author(),
    author: new Author(),

    // Message for the commit
    message: String(),

    // Does the commit bring any modification ?
    empty: true,

    // Parents
    parents: new Immutable.List(), // List<SHA>

    // Tree entries
    treeEntries: new Immutable.Map(), // Map<Path, TreeEntry>

    // New blobs to create
    blobs: new Immutable.Map() // Map<Path, Blob>
}, 'CommitBuilder');

// ---- Properties Getter ----
function getter(property) {
    return function() { return this.get(property); };
}

CommitBuilder.prototype.getMessage = getter('message');
CommitBuilder.prototype.getParents = getter('parents');
CommitBuilder.prototype.getAuthor = getter('author');
CommitBuilder.prototype.getTreeEntries = getter('treeEntries');
CommitBuilder.prototype.getBlobs = getter('blobs');
CommitBuilder.prototype.getCommitter = getter('committer');

/**
 * Returns true if the commit does not contain any change.
 */
CommitBuilder.prototype.isEmpty = function() {
    return this.get('empty');
};

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
