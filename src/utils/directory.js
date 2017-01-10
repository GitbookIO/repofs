const Path = require('path');
const flatten = require('array-flatten');
const uniqueBy = require('unique-by');

const FILETYPE = require('../constants/filetype');
const File = require('../models/file');
const TreeEntry = require('../models/treeEntry');

const PathUtils = require('./path');
const WorkingUtils = require('./working');
const FileUtils = require('./file');

/**
 * List files in a directory (shallow)
 * @param {RepositoryState} repoState
 * @param {Path} dirName
 * @return {Array<File>}
 */
function read(repoState, dirName) {
    dirName = PathUtils.norm(dirName);

    const workingState = repoState.getCurrentState();
    const changes = workingState.getChanges();
    const treeEntries = WorkingUtils.getMergedTreeEntries(workingState);

    const files = [];

    treeEntries.forEach(function(treeEntry, filepath) {
        // Ignore git submodules
        if (treeEntry.getType() !== TreeEntry.TYPES.BLOB) return;
        if (!PathUtils.contains(dirName, filepath)) return;

        const innerPath = PathUtils.norm(filepath.replace(dirName, ''));
        const isDirectory = innerPath.indexOf('/') >= 0;
        // Make it shallow
        const name = innerPath.split('/')[0];

        const file = new File({
            path: Path.join(dirName, name),
            type: isDirectory ? FILETYPE.DIRECTORY : FILETYPE.FILE,
            change: changes.get(filepath),
            fileSize: treeEntry.blobSize
        });

        files.push(file);
    });

    // Remove duplicate from entries within directories
    return uniqueBy(files, (file) => {
        return file.getName();
    });
}

/**
 * List files and directories in a directory (recursive).
 * Warning: This recursive implementation is very costly.
 * @param {RepositoryState} repoState
 * @param {Path} dirName
 * @return {Array<File>}
 */
function readRecursive(repoState, dirName) {
    // TODO improve performance and don't use .read() directly
    const files = read(repoState, dirName);

    let filesInDirs = files
        .filter((file) => {
            return file.isDirectory();
        })
        .map((dir) => {
            return readRecursive(repoState, dir.path);
        });

    filesInDirs = flatten(filesInDirs);

    return Array.prototype.concat(files, filesInDirs);
}

/**
 * List files in a directory (shallow)
 * @param {RepositoryState} repoState
 * @param {Path} dirName
 * @return {Array<Path>}
 */
function readFilenames(repoState, dirName) {
    const files = read(repoState, dirName);

    return files.map((file) => {
        return file.getPath();
    });
}

/**
 * List files recursively in a directory
 * @param {RepositoryState} repoState
 * @param {Path} dirName
 * @return {Array<Path>}
 */
function readFilenamesRecursive(repoState, dirName) {
    dirName = PathUtils.norm(dirName);

    const workingState = repoState.getCurrentState();
    const fileSet = WorkingUtils.getMergedFileSet(workingState);

    return fileSet.filter(function(path) {
        return PathUtils.contains(dirName, path);
    }).toArray();
}

/**
 * Rename a directory
 */
function move(repoState, dirName, newDirName) {
    // List entries to move
    const filesToMove = readFilenamesRecursive(repoState, dirName);

    // Push change to remove all entries
    return filesToMove.reduce(function(repoState, oldPath) {
        const newPath = Path.join(
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
    const filesToRemove = readFilenamesRecursive(repoState, dirName);

    // Push change to remove all entries
    return filesToRemove.reduce(function(repoState, path) {
        return FileUtils.remove(repoState, path);
    }, repoState);
}

const DirUtils = {
    read,
    readRecursive,
    readFilenames,
    readFilenamesRecursive,
    remove,
    move
};
module.exports = DirUtils;
