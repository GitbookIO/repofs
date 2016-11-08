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
LocalFile.prototype.getSha = function() {
    return this.get('sha');
};

LocalFile.prototype.getFilename = function() {
    return this.get('filename');
};

LocalFile.prototype.getStatus = function() {
    return this.get('status');
};

LocalFile.prototype.getAdditions = function() {
    return this.get('additions');
};

LocalFile.prototype.getDeletions = function() {
    return this.get('deletions');
};

LocalFile.prototype.getChanges = function() {
    return this.get('changes');
};

LocalFile.prototype.getPatch = function() {
    return this.get('patch');
};

/**
 * Create a LocalFile representing a status result at the given path (filename etc.)
 */
LocalFile.create = function (file) {
    return new LocalFile(file);
};

module.exports = LocalFile;
