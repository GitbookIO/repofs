var Q = require('q');
var immutable = require('immutable-js');

var File = require('./models/file');
var ContentState = require('./models/contentState');

function Repository(driver) {
    this.driver = driver;
}

// Read a file by its path
Repository.prototype.readFile = function(contentState, filePath) {
    var tree = contentState.getTree();
    var treeEntry = tree.getEntry(filePath);

    var file = new File()
};

module.exports = Repository;
