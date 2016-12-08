var Q = require('q');

var CacheUtils = require('./cache');

/**
 * Get a blob from cache
 * @param {SHA} sha
 * @return {Blob}
 */
function read(repoState, sha) {
    return repoState.getCache().getBlob(sha);
}

/**
 * Fetch a blob from SHA.
 * @param {RepositoryState} repoState
 * @param {Driver} driver
 * @param {SHA} sha
 * @return {Promise<RepositoryState>}
 */
function fetch(repoState, driver, sha) {
    if (isFetched(repoState, sha)) {
        // No op if already fetched
        return Q(repoState);
    }

    var cache = repoState.getCache();
    // Fetch the blob
    return driver.fetchBlob(sha)
    // Then store it in the cache
    .then(function(blob) {
        var newCache = CacheUtils.addBlob(cache, sha, blob);
        return repoState.set('cache', newCache);
    });
}

/**
 * @param {RepositoryState} repoState
 * @param {SHA} sha
 * @return {Boolean} True if a the corresponding blob is in cache.
 */
function isFetched(repoState, sha) {
    return repoState.getCache().getBlobs().has(sha);
}

var BlobUtils = {
    read: read,
    isFetched: isFetched,
    fetch: fetch
};
module.exports = BlobUtils;
