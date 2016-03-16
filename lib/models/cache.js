var immutable = require('immutable');

var Cache = immutable.Record({
    blobs: new immutable.OrderedMap()
});

// ---- Properties Getter ----
Cache.prototype.getBlobs = function() {
    return this.get('blobs');
};

// ---- Methods ----

// Return blob content
Cache.prototype.getBlob = function(blobSHA) {
    var blobs = this.getBlobs();
    return blobs.get(blobSHA);
};

module.exports = Cache;
