var _ = require('lodash');
var Path = require('path');

var FILETYPE = require('../constants/filetype');
var File = require('../models/file');

var PathUtils = require('./path');
var WorkingUtils = require('./working');
var FileUtils = require('./file');

/**
 * List entries in a directory (shallow)
 * @param {RepositoryState} repoState
 * @param {Path} dirName
 * @return {Array<File>}
 */
function read(repoState, dirName) {
    dirName = PathUtils.norm(dirName);

    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();
    var treeEntries = WorkingUtils.getMergedTreeEntries(workingState);

    var files = [];

    treeEntries.forEach(function(treeEntry, filepath) {
        if (!PathUtils.contains(dirName, filepath)) return;

        var innerPath = PathUtils.norm(filepath.replace(dirName, ''));
        var isDirectory = innerPath.indexOf('/') >= 0;
        var name = innerPath.split('/')[0];

        var file = new File({
            path: Path.join(dirName, name),
            type: isDirectory? FILETYPE.DIRECTORY : FILETYPE.FILE,
            change: changes.get(filepath),
            fileSize: treeEntry.blobSize
        });

        files.push(file);
    });

    return _.uniq(files, function(file) {
        return file.getName();
    });
}

/**
 * List files in a directory (shallow)
 * @param {RepositoryState} repoState
 * @param {Path} dirName
 * @return {Array<Path>}
 */
function readFilenames(repoState, dirName) {
    var files = read(repoState, dirName);

    return _.chain(files)
        .map(function(file) {
            return file.getPath();
        })
        .value();
}

/**
 * List files recursively in a directory
 * @param {RepositoryState} repoState
 * @param {Path} dirName
 * @return {Array<Path>}
 */
function readFilenamesRecursive(repoState, dirName) {
    dirName = PathUtils.norm(dirName);

    var workingState = repoState.getCurrentState();
    var fileSet = WorkingUtils.getMergedFileSet(workingState);

    return fileSet.filter(function(path) {
        return PathUtils.contains(dirName, path);
    }).toArray();
}

/**
 * Rename a directory
 */
function move(repoState, dirName, newDirName) {
    // List entries to move
    var filesToMove = readFilenamesRecursive(repoState, dirName);

    // Push change to remove all entries
    return filesToMove.reduce(function(repoState, oldPath) {
        var newPath = Path.join(
            newDirName,
            Path.relative(dirName, oldPath)
        );

        return FileUtils.move(repoState, oldPath, newPath);
    }, repoState);
}

/**
 * Remove a directory: push REMOVE changes for all entries in the directory
 */
function remove(repoState, dirName) {
    // List entries to move
    var filesToRemove = readFilenamesRecursive(repoState, dirName);

    // Push change to remove all entries
    return filesToRemove.reduce(function(repoState, path) {
        return FileUtils.remove(repoState, path);
    }, repoState);
}

module.exports = {
    read: read,
    readFilenames: readFilenames,
    readFilenamesRecursive: readFilenamesRecursive,
    remove: remove,
    move: move
};
