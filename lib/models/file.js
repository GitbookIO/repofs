var immutable = require('immutable');
var path = require('path');
var mime = require('mime-types');

var FILETYPE = require('../constants/filetype');

var File = immutable.Record({
    // Size of the file. 0 if the file was not fetched
    fileSize: 0,

    // Content of the blob containing the file's content
    // Null if the file was not fetched
    content: null, // Blob

    // Latest change on this file (or null)
    change: null,

    // Path of the file
    path: '',

    // Type of entry (see constants/filetype.js)
    type: FILETYPE.FILE
});

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

File.prototype.getChange = function() {
    return this.get('change');
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

module.exports = File;
