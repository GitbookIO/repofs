var util = require('util');
var immutable = require('immutable-js');

var CacheRecord = immutable.Record({
    blobs: new immutable.Map()
});

function Cache() {

}
util.inherits(Cache, CacheRecord);

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

// ---- Statics ----

// Add blob to cache
Cache.addBlob = function addBlob(cache, blob) {
    var blobs = cache.getBlobs();

    // Store blob in cache
    var newBlobs = blobs.set(blob.sha, blob.content);

    // Update cache with new blobs
    var newCache = cache.set('blobs', newBlobs);

    return newCache;
};

module.exports = Cache;
