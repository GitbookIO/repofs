const { Record } = require('immutable');

const DEFAULTS = {
    // SHA of the corresponding blob
    sha: null, // String, null when content is not available as blob

    // Mode of the file
    mode: '100644',

    // Size of the blob
    blobSize: 0
};

/**
 * A TreeEntry represents an entry from the git tree (Tree).
 * @type {Class}
 */
class TreeEntry extends Record(DEFAULTS) {
    // ---- Properties Getter ----

    getSha() {
        return this.get('sha');
    }

    hasSha() {
        return this.getSha() !== null;
    }

    getMode() {
        return this.get('mode');
    }

    getBlobSize() {
        return this.get('blobSize');
    }
}

// ---- Static ----

TreeEntry.encode = function(treeEntry) {
    return {
        sha: treeEntry.getSha(),
        mode: treeEntry.getMode(),
        size: treeEntry.getBlobSize()
    };
};

TreeEntry.decode = function(json) {
    return new TreeEntry({
        sha: json.sha,
        mode: json.mode,
        blobSize: json.size
    });
};

module.exports = TreeEntry;
