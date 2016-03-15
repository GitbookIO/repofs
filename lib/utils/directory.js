var CHANGES = require('../constants/changeTypes');
var pathUtils = require('./path');

var RepoUtils = require('./repo');
var WorkingUtils = require('./working');
var ChangeUtils = require('./change');

// List files in a directory
// Return an Array of TreeEntry
function readDir(repoState, dirName) {
    dirName = pathUtils.normalize(dirName);

    var workingState = repoState.getCurrentState();
    var tree = WorkingUtils.getWorkingTree(workingState);

    return tree.filter(function(entry) {
        return pathUtils.contains(dirName, entry.path);
    });
}

// Rename a directory
function moveDir(repoState, dirName, newName) {

}

// Remove a directory: push REMOVE changes for all entries in the directory
function removeDir(repoState, dirName) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();

    // List entries to move
    var entries = readDir(repoState, dirName);

    // Push change to remove all entries
    changes = entries.each(function(currentChanges, entry) {
        return ChangeUtils.pushChange(currentChanges, entry.getPath(), {
            type: CHANGES.REMOVE
        });
    });

    workingState = workingState.set('changes', changes);
    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

module.exports = {
    read: readDir,
    remove: removeDir,
    move: moveDir
};
