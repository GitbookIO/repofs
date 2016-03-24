var bufferUtils = require('./arraybuffer');

var FILETYPE = require('../constants/fileType');
var Change = require('../models/change');
var File = require('../models/file');

var error = require('./error');
var ChangeUtils = require('./change');
var WorkingUtils = require('./working');

/**
 * Stat details about a file
 * @return {File}
 */
function stat(repoState, filepath) {
    if(!exists(repoState, filepath)) {
        throw error.fileNotFound(filepath);
    }

    var workingState = repoState.getCurrentState();

    // Blob to lockup
    var blobSHA, blob;

    // Lookup file entry
    var treeEntry = workingState.getTreeEntries().get(filepath);

    // Lookup potential changes
    var change = workingState.getChanges().get(filepath);

    // Determine SHA of the blob
    if (change) {
        blobSHA = change.getSha();
    } else {
        blobSHA = treeEntry.getSha();
    }

    // Get the blob from change or cache
    if(blobSHA) {
        // Get content from cache
        blob = repoState.getCache().getBlob(blobSHA);
    } else {
        // No sha, so it must be in changes
        blob = change.getContent();
    }

    return new File({
        type: FILETYPE.FILE,
        fileSize: treeEntry? treeEntry.getBlobSize() : blob.getBlobSize(),
        path: filepath,
        change: change,
        content: blob
    });
}

/**
 * Read content of a file
 * @return {Blob}
 */
function read(repoState, filepath) {
    var file = stat(repoState, filepath);
    return file.getContent();
}

/**
 * Read content of a file, returns a String
 * @return {String}
 */
function readAsString(repoState, filepath, encoding) {
    var blob = read(repoState, filepath);
    return blob.getAsString(encoding);
}

/**
 * Return true if file exists in working tree, false otherwise
 */
function exists(repoState, filepath) {
    var workingState = repoState.getCurrentState();
    var mergedFileSet = WorkingUtils.getMergedFileSet(workingState);

    return mergedFileSet.has(filepath);
}

/**
 * Create a new file (must not exists already)
 * @param {RepositoryState} repoState
 * @param {Path} filepath
 * @param {String} content
 * @return {RepositoryState}
 */
function create(repoState, filepath, content) {
    if (exists(repoState, filepath)) {
        throw error.fileAlreadyExist(filepath);
    }
    var change = Change.createCreate(content);
    return ChangeUtils.setChange(repoState, filepath, change);
}

/**
 * Write a file (must exists)
 * @return {RepositoryState}
 */
function write(repoState, filepath, content) {
    if (!exists(repoState, filepath)) {
        throw error.fileNotFound(filepath);
    }

    var change = Change.createUpdate(content);
    return ChangeUtils.setChange(repoState, filepath, change);
}

/**
 * Remove a file
 * @return {RepositoryState}
 */
function remove(repoState, filepath) {
    if (!exists(repoState, filepath)) {
        throw error.fileNotFound(filepath);
    }

    var change = Change.createRemove();
    return ChangeUtils.setChange(repoState, filepath, change);
}

/**
 * Rename a file
 * @return {RepositoryState}
 */
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
