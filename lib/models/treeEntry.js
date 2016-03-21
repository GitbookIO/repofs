var immutable = require('immutable');

/*
 A TreeEntry represents an entry from the git tree (Tree).
*/

var TreeEntry = immutable.Record({
    // SHA of the corresponding blob
    sha: null, // String, null when content is not available as blob

    // Mode of the file
    mode: '100644'
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

// ---- Static ----

TreeEntry.encode = function (treeEntry) {
    return treeEntry.toJS();
};

TreeEntry.decode = function (json) {
    return new TreeEntry(json);
};

module.exports = TreeEntry;
