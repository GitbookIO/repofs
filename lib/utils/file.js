var CHANGES = require('../constants/changeType');

var bufferUtils = require('./arraybuffer');

var error = require('./error');
var RepoUtils = require('./repo');
var Change = require('../models/change');
var ChangeUtils = require('./change');
var WorkingUtils = require('./working');

// Read content of a file
// @return {ArrayBuffer}
function read(repoState, filepath) {
    if(!exists(repoState, filepath)) {
        throw error.fileNotFound(filepath);
    }

    var workingState = repoState.getCurrentState();
    var caches = repoState.getCache();


    // Find its content as Sha if possible
    var sha = WorkingUtils.findSha(workingState, filepath);
    if(sha) {
        // Get content from cache
        return repoState.getCache().getBlob(sha);
    } else {
        // No sha, so it must be in changes
        var change = workingState.getChanges().get(filepath);
        return bufferUtils.enforceArrayBuffer(change.getContent());
    }
}

// Read content of a file, returns a String
// @return {String}
function readAsString(repoState, filepath, encoding) {
    encoding = encoding || 'utf8';
    var buffer = read(repoState, filepath);
    return bufferUtils.enforceString(buffer, encoding);
}

// Read content of a file, returns a String
// @return {String}
function readAsString(repoState, filepath, encoding) {
    encoding = encoding || 'utf8';
    var buffer = read(repoState, filepath);
    return bufferUtils.enforceString(buffer, encoding);
}

// Return true if file exists in working tree, false otherwise
function exists(repoState, filepath) {
    var workingState = repoState.getCurrentState();
    var mergedFileSet = WorkingUtils.getMergedFileSet(workingState);

    return mergedFileSet.has(filepath);
}

// Create a new file (must not exists already)
// @param {RepositoryState} repoState
// @param {Path} filepath
// @param {String} content
// @return {RepositoryState}
function create(repoState, filepath, content) {
    if (exists(repoState, filepath)) {
        throw error.fileAlreadyExist(filepath);
    }
    var change = Change.createCreate(content);
    return ChangeUtils.setChange(repoState, filepath, change);
}

// Write a file (must exists)
// @return {RepositoryState}
function write(repoState, filepath, content) {
    if (!exists(repoState, filepath)) {
        throw error.fileNotFound(filepath);
    }

    var change = Change.createUpdate(content);
    return ChangeUtils.setChange(repoState, filepath, change);
}

// Remove a file
// @return {RepositoryState}
function remove(repoState, filepath) {
    if (!exists(repoState, filepath)) {
        throw error.fileNotFound(filepath);
    }

    var change = Change.createRemove();
    return ChangeUtils.setChange(repoState, filepath, change);
}

// Rename a file
// @return {RepositoryState}
function move(repoState, filepath, newFilepath) {
    var initialWorkingState = repoState.getCurrentState();

    // Create new file, with Sha if possible
    var sha = WorkingUtils.findSha(initialWorkingState, filepath);
    var changeNewFile;
    if(sha) {
        changeNewFile = Change.createCreateFromSha(sha);
    } else {
        // Content not available as blob
        var contentBuffer = bufferUtils.toBuffer(read(repoState, filepath));
        changeNewFile = Change.createCreate(contentBuffer);
    }

    // Remove old file
    var removedRepoState = remove(repoState, filepath);
    // Add new file
    return ChangeUtils.setChange(removedRepoState, newFilepath, changeNewFile);
}

module.exports = {
    exists: exists,
    read: read,
    readAsString: readAsString,
    create: create,
    write: write,
    remove: remove,
    move: move
};
