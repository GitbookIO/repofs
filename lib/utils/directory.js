var _ = require('lodash');
var Path = require('path');

var CHANGES = require('../constants/changeType');
var Change = require('../models/change');

var PathUtils = require('./path');
var RepoUtils = require('./repo');
var WorkingUtils = require('./working');
var ChangeUtils = require('./change');
var FileUtils = require('./file');

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

    // Remove duplicate
    return _.unique(shallowFiles);
}

// Rename a directory
function move(repoState, dirName, newDirName) {
    // List entries to move
    var filesToMove = readRecursive(repoState, dirName);

    // Push change to remove all entries
    return filesToMove.reduce(function(repoState, oldPath) {
        var newPath = Path.join(
            newDirName,
            Path.relative(dirName, oldPath)
        );

        return FileUtils.move(repoState, oldPath, newPath);
    }, repoState);
}

// Remove a directory: push REMOVE changes for all entries in the directory
function remove(repoState, dirName) {
    // List entries to move
    var filesToRemove = readRecursive(repoState, dirName);

    // Push change to remove all entries
    return filesToRemove.reduce(function(repoState, path) {
        return FileUtils.remove(repoState, path);
    }, repoState);
}

module.exports = {
    read: read,
    readRecursive: readRecursive,
    remove: remove,
    move: move
};
