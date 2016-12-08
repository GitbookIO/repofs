var Immutable = require('immutable');

var Cache = Immutable.Record({
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
    var blobs = this.getBlobs();
    return blobs.get(blobSHA);
};

module.exports = Cache;
