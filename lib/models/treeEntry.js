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
TreeEntry.prototype.getType = function() {
    return this.get('type');
};

TreeEntry.prototype.getSHA = function() {
    return this.get('sha');
};

TreeEntry.prototype.getMode = function() {
    return this.get('mode');
};

module.exports = TreeEntry;
