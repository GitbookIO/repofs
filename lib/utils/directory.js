var path = require('path');
var CHANGES = require('../constants/changeType');
var pathUtils = require('./path');

var RepoUtils = require('./repo');
var WorkingUtils = require('./working');
var ChangeUtils = require('./change');

// List files in a directory
// @param {RepositoryState} repoState
// @param {Path} dirName
// @return {Array<TreeEntry>}
function readDir(repoState, dirName) {
    dirName = pathUtils.normalize(dirName);

    var workingState = repoState.getCurrentState();
    var tree = WorkingUtils.getWorkingTree(workingState);

    return tree.filter(function(entry) {
        return pathUtils.contains(dirName, entry.path);
    });
}

// Rename a directory
function moveDir(repoState, dirName, newDirName) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();

    // List entries to move
    var entries = readDir(repoState, dirName);

    // Push change to remove all entries
    changes = entries.reduce(function(currentChanges, treeEntry, currentPath) {
        var newPath = path.join(
            newDirName,
            path.relative(dirName, currentPath)
        );

        // Create new file
        currentChanges = ChangeUtils.pushChange(changes, newPath, {
            type: CHANGES.CREATE,
            sha: treeEntry.getSha()
        });

        // Remove old one
        currentChanges = ChangeUtils.pushChange(changes, currentPath, {
            type: CHANGES.REMOVE
        });

        return currentChanges;
    }, changes);

    workingState = workingState.set('changes', changes);
    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

// Remove a directory: push REMOVE changes for all entries in the directory
function removeDir(repoState, dirName) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();

    // List entries to remove
    var entries = readDir(repoState, dirName);

    // Push change to remove all entries
    changes = entries.reduce(function(currentChanges, entry) {
        return ChangeUtils.pushChange(currentChanges, entry.getPath(), {
            type: CHANGES.REMOVE
        });
    }, changes);

    workingState = workingState.set('changes', changes);
    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

module.exports = {
    read: readDir,
    remove: removeDir,
    move: moveDir
};
