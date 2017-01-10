const { Record } = require('immutable');

const TYPES = {
    BLOB: 'blob',
    // tree: 'tree', we don't yet support this one
    COMMIT: 'commit'
};

const DEFAULTS = {
    // SHA of the corresponding blob
    sha: null, // String, null when content is not available as blob

    // Mode of the file
    mode: '100644',

    // Can be a 'tree', 'commit', or 'blob'
    type: TYPES.BLOB,

    // Size of the blob
    blobSize: 0
};

/**
 * A TreeEntry represents an entry from the git tree (Tree).
 * @type {Class}
 */
class TreeEntry extends Record(DEFAULTS) {
    // ---- Properties Getter ----
    getBlobSize() {
        return this.get('blobSize');
    }

    getMode() {
        return this.get('mode');
    }

    getSha() {
        return this.get('sha');
    }

    getType() {
        return this.get('type');
    }

    hasSha() {
        return this.getSha() !== null;
    }
}

// ---- Static ----

TreeEntry.encode = function(treeEntry) {
    return {
        sha: treeEntry.getSha(),
        type: treeEntry.getType(),
        mode: treeEntry.getMode(),
        size: treeEntry.getBlobSize()
    };
};

TreeEntry.decode = function(json) {
    return new TreeEntry({
        sha: json.sha,
        type: json.type,
        mode: json.mode,
        blobSize: json.size
    });
};

TreeEntry.TYPES = TYPES;

module.exports = TreeEntry;
