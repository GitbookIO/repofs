var immutable = require('immutable');

var Author = require('./author');

/*
    CommitBuilder instance are created before creating the new commit
    using the driver.
*/

var CommitBuilder = immutable.Record({
    // Commiter / Author
    committer: new Author(),
    author: new Author(),

    // Message for the commit
    message: String(),

    // Parents
    parents: new immutable.List(), // List<String>

    // Tree entries
    treeEntries: new immutable.Map(), // Map<Path, TreeEntry>

    // New blobs to create
    blobs: new immutable.Map() // Map<Path, Blob>
});

// ---- Properties Getter ----
CommitBuilder.prototype.getMessage = function() {
    return this.get('message');
};

CommitBuilder.prototype.getParents = function() {
    return this.get('parents');
};

// ---- Statics

// Create a commit builder from a definition
// @return {CommitBuilder}
CommitBuilder.create = function(opts) {
    opts.committer = opts.committer || opts.author;
    return new CommitBuilder(opts);
};

module.exports = CommitBuilder;
