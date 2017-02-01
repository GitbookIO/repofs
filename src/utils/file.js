const Q = require('q');
const bufferUtils = require('./arraybuffer');

const FILETYPE = require('../constants/filetype');
const Change = require('../models/change');
const File = require('../models/file');

const error = require('./error');
const ChangeUtils = require('./change');
const WorkingUtils = require('./working');
const BlobUtils = require('./blob');

/**
 * Fetch a file blob. Required for content access with
 * stat/read. No-op if the file is already fetched.
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

    const workingState = repoState.getCurrentState();
    const blobSha = WorkingUtils.findSha(workingState, filepath);

    return BlobUtils.fetch(repoState, driver, blobSha);
}

/**
 * @param {RepositoryState} repoState
 * @param {Path} filepath
 * @return {Boolean} True if the file's content is in cache
 */
function isFetched(repoState, filepath) {
    const workingState = repoState.getCurrentState();
    const blobSha = WorkingUtils.findSha(workingState, filepath);
    // If sha is null then there are changes (those which are stored
    // and need not be fetched)
    return (blobSha === null) || BlobUtils.isFetched(repoState, blobSha);
}

/**
 * Stat details about a file.
 * @param {RepositoryState} repoState
 * @param {Path} filepath
 * @return {File}
 */
function stat(repoState, filepath) {
    const workingState = repoState.getCurrentState();

    // Lookup potential changes
    const change = workingState.getChanges().get(filepath);
    // Lookup file entry
    const treeEntry = workingState.getTreeEntries().get(filepath);

    // Determine SHA of the blob
    let blobSHA;
    if (change) {
        blobSHA = change.getSha();
    } else {
        blobSHA = treeEntry.getSha();
    }

    // Get the blob from change or cache
    let blob;
    if (blobSHA) {
        // Get content from cache
        blob = repoState.getCache().getBlob(blobSHA);
    } else {
        // No sha, so it must be in changes
        blob = change.getContent();
    }

    let fileSize;
    if (blob) {
        fileSize = blob.getByteLength();
    } else {
        // It might have been moved (but not fetched)
        const originalEntry = workingState.getTreeEntries().find((entry) => {
            return entry.getSha() === blobSHA;
        });
        fileSize = originalEntry.getBlobSize();
    }

    return new File({
        type: FILETYPE.FILE,
        fileSize,
        path: filepath,
        content: blob
    });
}

/**
 * Read content of a file
 * @param {Path} filepath
 * @return {Blob}
 */
function read(repoState, filepath) {
    const file = stat(repoState, filepath);
    return file.getContent();
}

/**
 * Read content of a file, returns a String
 * @return {String}
 */
function readAsString(repoState, filepath, encoding) {
    const blob = read(repoState, filepath);
    return blob.getAsString(encoding);
}

/**
 * Return true if file exists in working tree, false otherwise
 */
function exists(repoState, filepath) {
    const workingState = repoState.getCurrentState();
    const mergedFileSet = WorkingUtils.getMergedTreeEntries(workingState);

    return mergedFileSet.has(filepath);
}

/**
 * Create a new file (must not exists already)
 * @param {RepositoryState} repoState
 * @param {Path} filepath
 * @param {String} [content='']
 * @return {RepositoryState}
 */
function create(repoState, filepath, content) {
    content = content || '';
    if (exists(repoState, filepath)) {
        throw error.fileAlreadyExist(filepath);
    }
    const change = Change.createCreate(content);
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

    const change = Change.createUpdate(content);
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

    const change = Change.createRemove();
    return ChangeUtils.setChange(repoState, filepath, change);
}

/**
 * Rename a file
 * @return {RepositoryState}
 */
function move(repoState, filepath, newFilepath) {
    if (filepath === newFilepath) {
        return repoState;
    }

    const initialWorkingState = repoState.getCurrentState();

    // Create new file, with Sha if possible
    const sha = WorkingUtils.findSha(initialWorkingState, filepath);
    let changeNewFile;
    if (sha) {
        changeNewFile = Change.createCreateFromSha(sha);
    } else {
        // Content not available as blob
        const contentBuffer = bufferUtils.toBuffer(read(repoState, filepath));
        changeNewFile = Change.createCreate(contentBuffer);
    }

    // Remove old file
    const removedRepoState = remove(repoState, filepath);
    // Add new file
    return ChangeUtils.setChange(removedRepoState, newFilepath, changeNewFile);
}

/**
 * Returns true if the given file has the same content in both
 * RepositoryState's current working state, or is absent from both.
 * @param {RepositoryState} previousState
 * @param {RepositoryState} newState
 * @param {Path} filepath
 * @return {Boolean}
 */
function hasChanged(previousState, newState, filepath) {
    const previouslyExists = exists(previousState, filepath);
    const newExists = exists(newState, filepath);
    if (!previouslyExists && !newExists) {
        // Still non existing
        return false;
    } else if (exists(previousState, filepath) !== exists(newState, filepath)) {
        // The file is absent from one
        return true;
    } else {
        // Both files exist
        const prevWorking = previousState.getCurrentState();
        const newWorking = newState.getCurrentState();

        const prevSha = WorkingUtils.findSha(prevWorking, filepath);
        const newSha = WorkingUtils.findSha(newWorking, filepath);
        if (prevSha === null && newSha === null) {
            // Both have are in pending changes. We can compare their contents
            return read(previousState, filepath).getAsString() !==
                read(newState, filepath).getAsString();
        } else {
            // Content changed if Shas are different, or one of them is null
            return prevSha !== newSha;
        }
    }
}

const FileUtils = {
    stat,
    fetch,
    isFetched,
    exists,
    read,
    readAsString,
    create,
    write,
    remove,
    move,
    hasChanged
};
module.exports = FileUtils;
