// Add a new blob to a cache instance
// @param {Cache}
// @param {Object(sha, content)}
// @return {Cache}
function addBlob(cache, blob) {
    var blobs = cache.getBlobs();

    // Store blob in cache
    var newBlobs = blobs.set(blob.sha, blob.content);

    // Update cache with new blobs
    var newCache = cache.set('blobs', newBlobs);

    return newCache;
}

module.exports = {
    addBlob: addBlob
};
