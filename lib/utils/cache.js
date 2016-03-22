var Blob = require('../models/blob');

/**
 * Add a new blob to a cache instance
 * @param {Cache} cache
 * @param {Object} info sha: String, content: ArrayBuffer
 * @return {Cache}
 */
function addBlob(cache, info) {
    var blobs = cache.getBlobs();
    var blob = Blob.createFromArrayBuffer(info.content);

    // Store blob in cache
    var newBlobs = blobs.set(info.sha, blob);

    // Update cache with new blobs
    var newCache = cache.set('blobs', newBlobs);

    return newCache;
}

module.exports = {
    addBlob: addBlob
};
