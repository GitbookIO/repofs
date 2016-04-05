var Q = require('q');
var bufferUtils = require('./arraybuffer');

var FILETYPE = require('../constants/filetype');
var Change = require('../models/change');
var File = require('../models/file');

var error = require('./error');
var ChangeUtils = require('./change');
var WorkingUtils = require('./working');
var RepoUtils = require('./repo');
var CacheUtils = require('./cache');

/**
 * Fetch a file blob. Required for content access with
 * stat/read. No-op if there are pending changes for the file.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {Path} filepath
 * @return {Promise<RepositoryState>}
 */
function fetch(repoState, driver, filepath) {
    if (isFetched(repoState, filepath)) {
        // No op if already fetched
        return Q(repoState);
    }

    var workingState = repoState.getCurrentState();
    var blobSha = WorkingUtils.findSha(workingState, filepath);
    var cache = repoState.getCache();

    // Fetch the blob
    return driver.fetchBlob(blobSha)
    // Then store it in the cache
    .then(function(blob) {
        var newCache = CacheUtils.addBlob(cache, blobSha, blob);
        return repoState.set('cache', newCache);
    });
}

/**
 * @param {RepositoryState} repoState
 * @param {Path} filepath
 * @return {Boolean} True if the file's content can be accessed
 * without fetching it
 */
function isFetched(repoState, filepath) {
    var workingState = repoState.getCurrentState();
    var blobSha = WorkingUtils.findSha(workingState, filepath);
    // If sha is null then there are changes (those which are stored
    // and need not be fetched)
    return (blobSha === null) || (repoState.getCache().getBlobs().has(blobSha));
}

/**
 * Stat details about a file.
 * @param {RepositoryState} repoState
 * @param {Path} filepath
 * @return {File}
 */
function stat(repoState, filepath) {
    if (!exists(repoState, filepath)) {
        throw error.fileNotFound(filepath);
    }

    var workingState = repoState.getCurrentState();

    // Blob to lookup
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
    if (blobSHA) {
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
    if (sha) {
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

/**
 * Returns true if the given file has the same content in both
 * RepositoryState, or is absent from both.
 * @param {RepositoryState} previousState
 * @param {RepositoryState} newState
 * @param {Path} filepath
 * @return {Boolean}
 */
function hasChanged(previousState, newState, filepath) {
    var previouslyExists = exists(previousState, filepath);
    var newExists = exists(newState, filepath);
    if (!previouslyExists && !newExists) {
        // Still non existing
        return false;
    } else if (exists(previousState, filepath) !== exists(newState, filepath)) {
        // The file is absent from one
        return true;
    } else {
        // Both files exist
        var prevWorking = previousState.getCurrentState();
        var newWorking = newState.getCurrentState();

        var prevSha = WorkingUtils.hasPendingChanges(prevWorking, filepath);
        var newSha = WorkingUtils.hasPendingChanges(newWorking, filepath);
        if (prevSha === null && newSha === null) {
            // Both have pending changes and can be read without fetching.
            return read(previousState, filepath) !== read(previousState, filepath);
        } else {
            // Content changed if Shas are different, or one of them is null
            return prevSha !== newSha;
        }
    }
}

module.exports = {
    stat: stat,
    fetch: fetch,
    isFetched: isFetched,
    exists: exists,
    read: read,
    readAsString: readAsString,
    create: create,
    write: write,
    remove: remove,
    move: move,
    hasChanged: hasChanged
};
