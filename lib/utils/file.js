var CHANGES = require('../constants/changeType');

var arrayBuffer = require('./arrayBuffer');
var error = require('./error');
var RepoUtils = require('./repo');
var ChangeUtils = require('./change');
var WorkingUtils = require('./working');


// Read content of a file, returns an ArrayBuffer
function readFile(repoState, filename) {
    var workingState = repoState.getCurrentState();
    var caches = repoState.getCache();
    var changes = workingState.getChanges();
    var change = changes.get(filename);

    // File has been modified?
    if (change) {
        if (change.getType() == CHANGES.REMOVE) {
            throw error.fileNotFound(filename);
        }

        return change.getContent();
    }

    var treeEntries = workingState.getTreeEntries();
    var treeEntry = treeEntries.get(filename);

    // File entry does not exists
    if (!treeEntry) {
        throw error.fileNotFound(filename);
    }

    // Get content from cache
    return caches.getBlob(treeEntry.getSHA());
}

// Read content of a file, returns a String
function readFileAsString(repoState, filename, encoding) {
    encoding = encoding || 'utf8';
    var buffer = readFile(repoState, filename);
    return arrayBuffer.enforceString(buffer, encoding);
}

// Push a new change
function pushChange(repoState, filename, type, content) {
    var workingState = repoState.getCurrentState();

    // Push changes to list
    var changes = workingState.getChanges();
    changes = ChangeUtils.pushChange(changes, filename, type, content);

    // Update workingState and repoState
    workingState = workingState.set('changes', changes);

    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

// Return true if file exists in working tree, false otherwise
function fileExists(repoState, filename) {
    var workingState = repoState.getCurrentState();
    var tree = WorkingUtils.getWorkingTree(workingState);

    return tree.has(filename);
}

// Create a new file
function createFile(repoState, filename, content) {
    if (fileExists(repoState, filename)) {
        throw error.fileAlreadyExist(filename);
    }

    return pushChange(repoState, filename, {
        type: CHANGES.CREATE,
        content: content
    });
}

// Write a file
function writeFile(repoState, filename, content) {
    if (!fileExists(repoState, filename)) {
        throw error.fileAlreadyExist(filename);
    }

    return pushChange(repoState, filename, {
        type: CHANGES.UPDATE,
        content: content
    });
}

// Remove a file
function removeFile(repoState, filename) {
    if (!fileExists(repoState, filename)) {
        throw error.fileAlreadyExist(filename);
    }

    return pushChange(repoState, filename, {
        type: CHANGES.REMOVE
    });
}

// Rename a file
function moveFile(repoState, filename, newFilename) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();
    var tree = WorkingUtils.getWorkingTree(workingState);
    var treeEntry = tree.get(filename);

    // File entry does not exists
    if (!treeEntry) {
        throw error.fileNotFound(filename);
    }

    // New file exists?
    if (tree.has(newFilename)) {
        throw error.fileAlreadyExist(newFilename);
    }

    // Create new file
    changes = ChangeUtils.pushChange(changes, newFilename, {
        type: CHANGES.CREATE,
        sha: treeEntry.getSHA()
    });

    // Remove old one
    changes = ChangeUtils.pushChange(changes, filename, {
        type: CHANGES.REMOVE
    });

    workingState = workingState.set('changes', changes);
    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

module.exports = {
    exists: fileExists,
    read: readFile,
    readAsString: readFileAsString,
    create: createFile,
    write: writeFile,
    remove: removeFile,
    move: moveFile
};
