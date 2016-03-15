var CHANGES = require('../constants/changeTypes');

var Changes = require('../models/changes');

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

// Push a new change
function pushChange(workingState, filename, type, content) {
    var changes = workingState.getChanges();
    changes = Changes.pushChange(changes, filename, type, content);

    return workingState.set('changes', changes);
}

// Create a new file
function createFile(workingState, filename, content) {
    return pushChange(workingState, filename, {
        type: CHANGES.CREATE,
        content: content
    });
}

// Write a file
function writeFile(workingState, filename, content) {
    return pushChange(workingState, filename, {
        type: CHANGES.UPDATE,
        content: content
    });
}

// Remove a file
function removeFile(workingState, filename) {
    return pushChange(workingState, filename, {
        type: CHANGES.REMOVE
    });
}

// Rename a file
function moveFile(workingState, filename, newFilename) {
    var changes = workingState.getChanges();
    var tree = workingState.getTree();
    var treeEntry = tree.getEntry(filename);

    // File entry does not exists
    if (!treeEntry) {
        throw error.fileNotFound(filename);
    }

    // Create new file
    changes = Changes.pushChange(changes, filename, {
        type: CHANGES.CREATE,
        sha: treeEntry.getSHA()
    });

    // Remove old one
    changes = Changes.pushChange(changes, filename, {
        type: CHANGES.REMOVE
    });

    return workingState.set('changes', changes);
}

module.exports = {
    read: readFile,
    readAsString: readFileAsString,
    create: createFile,
    write: writeFile,
    remove: removeFile,
    move: moveFile
};
