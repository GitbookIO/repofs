const { Record } = require('immutable');

const DEFAULTS = {
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
};

/**
 * LocalFile represents a status result
 * @type {Class}
 */
class LocalFile extends Record(DEFAULTS) {
    // ---- Properties Getter ----
    getSha() {
        return this.get('sha');
    }

    getFilename() {
        return this.get('filename');
    }

    getStatus() {
        return this.get('status');
    }

    getAdditions() {
        return this.get('additions');
    }

    getDeletions() {
        return this.get('deletions');
    }

    getChanges() {
        return this.get('changes');
    }

    getPatch() {
        return this.get('patch');
    }
}

/**
 * Create a LocalFile representing a status result at the given path (filename etc.)
 */
LocalFile.create = function(file) {
    return new LocalFile(file);
};

module.exports = LocalFile;
