var util = require('util');
var immutable = require('immutable-js');

var TreeEntry = require('./treeEntry');

var TreeRecord = immutable.Record({
    entries: new immutable.Map(TreeEntry)
});

function Tree() {

}
util.inherits(Tree, TreeRecord);

// ---- Properties Getter ----
Tree.prototype.getEntries = function() {
    return this.get('entries');
};

// ---- Methods ----

// Return a specific entry by its filepath
Tree.prototype.getEntry = function(filePath) {
    var entries = this.getEntries();
    return entries.get(filePath);
};

module.exports = Tree;
