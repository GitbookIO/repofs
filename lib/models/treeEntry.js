var util = require('util');
var immutable = require('immutable');

/*
A TreeEntry represents a simple entry from the git tree (Tree).
*/

var TreeEntryRecord = immutable.Record({
    path: '',
    size: 0,
    sha: ''
});

function TreeEntry() {

}
util.inherits(TreeEntry, TreeEntryRecord);

// ---- Properties Getter ----
TreeEntry.prototype.getPath = function() {
    return this.get('path');
};

TreeEntry.prototype.getType = function() {
    return this.get('type');
};

TreeEntry.prototype.getSHA = function() {
    return this.get('sha');
};

module.exports = TreeEntry;
