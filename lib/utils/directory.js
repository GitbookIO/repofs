var path = require('path');
var CHANGES = require('../constants/changeType');
var pathUtils = require('./path');

var RepoUtils = require('./repo');
var WorkingUtils = require('./working');
var ChangeUtils = require('./change');

// List files recursively in a directory
// @param {RepositoryState} repoState
// @param {Path} dirName
// @return {Array<Path>}
function readRecursive(repoState, dirName) {
    dirName = pathUtils.norm(dirName);

    var workingState = repoState.getCurrentState();
    var fileSet = WorkingUtils.getMergedFileSet(workingState);

    return fileSet.filter(function(path) {
        return pathUtils.contains(dirName, path);
    }).toArray();
}

// List files in a directory (shallow)
// @param {RepositoryState} repoState
// @param {Path} dirName
// @return {Array<Path>}
function read(repoState, dirName) {
    var allFiles = readRecursive(repoState, dirName);

    return allFiles.filter(function(entry) {
        // Only if one level under dirName
        throw new Error('TODO not implemented');
    });
}

// Rename a directory
function move(repoState, dirName, newDirName) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();

    // List entries to move
    var entries = read(repoState, dirName);

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
function remove(repoState, dirName) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();

    // List entries to remove
    var entries = read(repoState, dirName);

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
    read: read,
    readRecursive: readRecursive,
    remove: remove,
    move: move
};
