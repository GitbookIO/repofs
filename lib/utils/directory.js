var _ = require('lodash');
var Path = require('path');

var CHANGES = require('../constants/changeType');
var PathUtils = require('./path');

var RepoUtils = require('./repo');
var WorkingUtils = require('./working');
var ChangeUtils = require('./change');

// List files recursively in a directory
// @param {RepositoryState} repoState
// @param {Path} dirName
// @return {Array<Path>}
function readRecursive(repoState, dirName) {
    dirName = PathUtils.norm(dirName);

    var workingState = repoState.getCurrentState();
    var fileSet = WorkingUtils.getMergedFileSet(workingState);

    return fileSet.filter(function(path) {
        return PathUtils.contains(dirName, path);
    }).toArray();
}

// List files in a directory (shallow)
// @param {RepositoryState} repoState
// @param {Path} dirName
// @return {Array<Path>}
function read(repoState, dirName) {
    var allFiles = readRecursive(repoState, dirName);

    var shallowFiles = allFiles.map(function(path) {
        var relativePath = Path.relative(dirName, path);
        // relativePath should be like 'foo/.../' and we want to
        // return 'foo'
        return Path.join(dirName, relativePath.split(Path.sep)[0]);
    });

    return _.unique(shallowFiles);
}

// Rename a directory
function move(repoState, dirName, newDirName) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();

    // List entries to move
    var entries = read(repoState, dirName);

    // Push change to remove all entries
    changes = entries.reduce(function(currentChanges, treeEntry, currentPath) {
        var newPath = Path.join(
            newDirName,
            Path.relative(dirName, currentPath)
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
