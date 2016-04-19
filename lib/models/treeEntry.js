var immutable = require('immutable');

/**
 * A TreeEntry represents an entry from the git tree (Tree).
 */

var TreeEntry = immutable.Record({
    // SHA of the corresponding blob
    sha: null, // String, null when content is not available as blob

    // Mode of the file
    mode: '100644',

    // Size of the blob
    blobSize: 0
});

// ---- Properties Getter ----
TreeEntry.prototype.getSha = function() {
    return this.get('sha');
};

TreeEntry.prototype.hasSha = function() {
    return this.getSha() !== null;
};

TreeEntry.prototype.getMode = function() {
    return this.get('mode');
};

TreeEntry.prototype.getBlobSize = function() {
    return this.get('blobSize');
};

// ---- Static ----

TreeEntry.encode = function (treeEntry) {
    return {
        sha: treeEntry.getSha(),
        mode: treeEntry.getMode(),
        size: treeEntry.getBlobSize()
    };
};

TreeEntry.decode = function (json) {
    return new TreeEntry({
        sha: json.sha,
        mode: json.mode,
        blobSize: json.size
    });
};

module.exports = TreeEntry;
