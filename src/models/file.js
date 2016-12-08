const { Record } = require('immutable');
const path = require('path');
const mime = require('mime-types');

const FILETYPE = require('../constants/filetype');

const DEFAULTS = {
    // Size of the file. 0 if the file was not fetched
    fileSize: 0,

    // Content of the blob containing the file's content
    // Null if the file was not fetched
    content: null, // Blob

    // Path of the file
    path: '',

    // Type of entry (see constants/filetype.js)
    type: FILETYPE.FILE
};

/**
 * @type {Class}
 */
class File extends Record(DEFAULTS) {
    // ---- Properties Getter ----

    getContent() {
        return this.get('content');
    }

    getFileSize() {
        return this.get('fileSize');
    }

    getPath() {
        return this.get('path');
    }

    getType() {
        return this.get('type');
    }

    isDirectory() {
        return this.getType() == FILETYPE.DIRECTORY;
    }

    getMime() {
        return mime.lookup(path.extname(this.getPath())) || 'application/octet-stream';
    }

    getName() {
        return path.basename(this.getPath());
    }
}

/**
 * Create a File representing a directory at the given path (empty content etc.).
 */
File.createDir = function(filepath) {
    return new File({
        path: filepath,
        type: FILETYPE.DIRECTORY
    });
};

/**
 * Create a File representing a directory at the given path (empty content etc.).
 */
File.create = function(filepath, fileSize) {
    return new File({
        path: filepath,
        fileSize: fileSize || 0,
        type: FILETYPE.FILE
    });
};

module.exports = File;
