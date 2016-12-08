const { Record, OrderedMap } = require('immutable');

const DEFAULTS = {
    blobs: OrderedMap() // OrderedMap<SHA, Blob>
};

class Cache extends Record(DEFAULTS) {
    // ---- Properties Getter ----
    getBlobs() {
        return this.get('blobs');
    }

    // ---- Methods ----

    /**
     * Return blob content
     */
    getBlob(blobSHA) {
        const blobs = this.getBlobs();
        return blobs.get(blobSHA);
    }
}

module.exports = Cache;
