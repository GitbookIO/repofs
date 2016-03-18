var _ = require('lodash');
var immutable = require('immutable');

var arrayBuffer = require('../utils/arraybuffer');

// Don't read blob over 1MB
var BLOB_MAX_SIZE = 1*1024*1024;

/*
 A TreeEntry represents an entry from the git tree (Tree).
*/

var Blob = immutable.Record({
    // Size of the file
    blobSize: 0,

    // Content has a buffer
    content: new ArrayBuffer()
});

// ---- Properties Getter ----
Blob.prototype.getBlobSize = function() {
    return this.get('blobSize');
};

Blob.prototype.getContent = function() {
    return this.get('content');
};

// ---- Methods ----

// Return content as a base64 string
Blob.prototype.getAsBase64 = function() {
    return arrayBuffer.toBase64(this.getContent());
};

// Return blob content as a string
// @param {encoding}
Blob.prototype.getAsString = function(encoding) {
    return arrayBuffer.enforceString(this.getContent(), encoding);
};

// Return true if blob is too big
Blob.prototype.isTooBig = function() {
    return this.getBlobSize() > BLOB_MAX_SIZE;
};

// ---- Static ----

Blob.createFromArrayBuffer = function(buf) {
    return new Blob({
        size: buf.length,
        content: buf.length>BLOB_MAX_SIZE? null : buf
    });
};

Blob.createFromBase64 = function(content) {
    var buf = arrayBuffer.fromBase64(content);
    return Blob.createFromArrayBuffer(buf);
};

Blob.createFromBuffer = function(content) {
    var buf = arrayBuffer.fromBuffer(content);
    return Blob.createFromArrayBuffer(buf);
};

Blob.createFromString = function(content) {
    var buf = arrayBuffer.fromString(content);
    return Blob.createFromArrayBuffer(buf);
};

Blob.encode = function(blob) {
    return {
        size: blob.blobSize,
        content: blob.getAsBase64()
    };
};

Blob.decode = function(json) {
    if (_.isString(json)) {
        return Blob.createFromString(json);
    } else {
        return Blob.createFromString(json.content);
    }
};

module.exports = Blob;
