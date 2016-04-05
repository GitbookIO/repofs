/**
 * Add a new blob to a cache instance
 * @param {Cache} cache
 * @param {String} sha Used as key
 * @param {Blob} blob
 * @return {Cache}
 */
function addBlob(cache, sha, blob) {
    var blobs = cache.getBlobs();
    var newBlobs = blobs.set(sha, blob);

    var newCache = cache.set('blobs', newBlobs);
    return newCache;
}

module.exports = {
    addBlob: addBlob
};
