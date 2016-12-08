const Immutable = require('immutable');
const path = require('path');
const mime = require('mime-types');

const FILETYPE = require('../constants/filetype');

const File = Immutable.Record({
    // Size of the file. 0 if the file was not fetched
    fileSize: 0,

    // Content of the blob containing the file's content
    // Null if the file was not fetched
    content: null, // Blob

    // Path of the file
    path: '',

    // Type of entry (see constants/filetype.js)
    type: FILETYPE.FILE
}, 'File');

// ---- Properties Getter ----
File.prototype.getContent = function() {
    return this.get('content');
};

File.prototype.getFileSize = function() {
    return this.get('fileSize');
};

File.prototype.getPath = function() {
    return this.get('path');
};

File.prototype.getType = function() {
    return this.get('type');
};

File.prototype.isDirectory = function() {
    return this.getType() == FILETYPE.DIRECTORY;
};

File.prototype.getMime = function() {
    return mime.lookup(path.extname(this.getPath())) || 'application/octet-stream';
};

File.prototype.getName = function() {
    return path.basename(this.getPath());
};

/**
 * Create a File representing a directory at the given path (empty content etc.).
 */
File.createDir = function(path) {
    return new File({
        path,
        type: FILETYPE.DIRECTORY
    });
};

/**
 * Create a File representing a directory at the given path (empty content etc.).
 */
File.create = function(path, fileSize) {
    return new File({
        path,
        fileSize: fileSize || 0,
        type: FILETYPE.FILE
    });
};

module.exports = File;
