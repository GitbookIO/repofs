const Immutable = require('immutable');

const Cache = Immutable.Record({
    blobs: new Immutable.OrderedMap() // OrderedMap<SHA, Blob>
}, 'Cache');

// ---- Properties Getter ----
Cache.prototype.getBlobs = function() {
    return this.get('blobs');
};

// ---- Methods ----

/**
 * Return blob content
 */
Cache.prototype.getBlob = function(blobSHA) {
    const blobs = this.getBlobs();
    return blobs.get(blobSHA);
};

module.exports = Cache;
