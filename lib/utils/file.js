var CHANGES = require('../constants/changeTypes');
var arrayBuffer = require('./arrayBuffer');
var error = require('./error');

// Read content of a file, returns an ArrayBuffer
function readFile(workingState, filename) {
    var changes = workingState.getChanges();
    var change = changes.getEntry(filename);

    // File has been modified?
    if (change) {
        if (change.getType() == CHANGES.REMOVE) {
            throw error.fileNotFound(filename);
        }

        return change.getContent();
    }

    var tree = workingState.getTree();
    var treeEntry = tree.getEntry(filename);

    // File entry does not exists
    if (!treeEntry) {
        throw error.fileNotFound(filename);
    }

    // Get content from cache
    var caches = workingState.getCache();
    return caches.getBlob(treeEntry.getSHA());
}

// Read content of a file, returns a String
function readFileAsString(workingState, filename, encoding) {
    encoding = encoding || 'utf8';
    var buffer = readFile(workingState, filename);
    return arrayBuffer.enforceString(buffer, encoding);
}

// Create a new file
function createFile(workingState, filename) {

}

// Write a file
function writeFile(workingState, filename, content) {

}

module.exports = {
    read: readFile,
    readAsString: readFileAsString,
    create: createFile,
    write: writeFile
};
