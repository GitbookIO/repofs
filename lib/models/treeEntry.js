var immutable = require('immutable');

/*
    A TreeEntry represents an entry from the git tree (Tree).
*/

var TreeEntry = immutable.Record({
    // Size of the file
    size: 0,

    // SHA of the corresponding blob
    sha: '',

    // Mode of the file
    mode: '100644'
});

// ---- Properties Getter ----
TreeEntry.prototype.getSize = function() {
    return this.get('size');
};

TreeEntry.prototype.getSHA = function() {
    return this.get('sha');
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
