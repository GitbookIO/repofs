var Immutable = require('immutable');
var path = require('path');
var mime = require('mime-types');

var FILETYPE = require('../constants/filetype');

var LocalFile = Immutable.Record({
    // Sha1 of the modified blob,
    sha: null,

    // Path of the file
    filename: '',

    // File status
    status: '',

    // Number of additions
    additions: 0,

    // Number of deletions
    deletions: 0,

    // Number of changes
    changes: 0,

    // Git patch to apply
    patch: ''
}, 'LocalFile');

// ---- Properties Getter ----
LocalFile.prototype.getContent = function() {
    return this.get('content');
};

LocalFile.prototype.getLocalFileSize = function() {
    return this.get('fileSize');
};

LocalFile.prototype.getPath = function() {
    return this.get('path');
};

LocalFile.prototype.getType = function() {
    return this.get('type');
};

LocalFile.prototype.isDirectory = function() {
    return this.getType() == FILETYPE.DIRECTORY;
};

LocalFile.prototype.getMime = function() {
    return mime.lookup(path.extname(this.getPath())) || 'application/octet-stream';
};

LocalFile.prototype.getName = function() {
    return path.basename(this.getPath());
};

/**
 * Create a LocalFile representing a status result at the given path (filename etc.)
 */
LocalFile.create = function (file) {
    return new LocalFile(file);
};

module.exports = LocalFile;
