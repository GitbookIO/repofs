var Immutable = require('immutable');

var arrayBuffer = require('../utils/arraybuffer');

// Don't read blob over 1MB
var BLOB_MAX_SIZE = 1*1024*1024;

var Blob = Immutable.Record({
    // Size of the file
    byteLength: 0,

    // Content as a buffer
    content: new ArrayBuffer()
}, 'Blob');

// ---- Properties Getter ----
Blob.prototype.getByteLength = function() {
    return this.get('byteLength');
};

Blob.prototype.getContent = function() {
    return this.get('content');
};

// ---- Methods ----

/**
 * Return content as an ArrayBuffer
 */
Blob.prototype.getAsArrayBuffer = function() {
    return this.getContent();
};

/**
 * Return content as a base64 string
 */
Blob.prototype.getAsBase64 = function() {
    return arrayBuffer.toBase64(this.getContent());
};

/**
 * Return blob content as a string
 * @param {encoding}
 */
Blob.prototype.getAsString = function(encoding) {
    encoding = encoding || 'utf8';
    return arrayBuffer.enforceString(this.getContent(), encoding);
};

/**
 * @return {Buffer} the blob as Buffer
 */
Blob.prototype.getAsBuffer = function(encoding) {
    return arrayBuffer.enforceBuffer(this.getContent());
};

/**
 * Return true if blob is too big
 */
Blob.prototype.isTooBig = function() {
    return this.getByteLength() > BLOB_MAX_SIZE;
};

// ---- Static ----

Blob.create = function create(buf) {
    if (buf instanceof Blob) return buf;
    return Blob.createFromArrayBuffer(arrayBuffer.enforceArrayBuffer(buf));
};

Blob.createFromArrayBuffer = function createFromArrayBuffer(buf) {
    return new Blob({
        byteLength: buf.byteLength,
        content: buf.byteLength>BLOB_MAX_SIZE? null : buf
    });
};

Blob.createFromBase64 = function createFromBase64(content) {
    var buf = arrayBuffer.fromBase64(content);
    return Blob.createFromArrayBuffer(buf);
};

Blob.createFromBuffer = function createFromBuffer(content) {
    var buf = arrayBuffer.fromBuffer(content);
    return Blob.createFromArrayBuffer(buf);
};

Blob.createFromString = function createFromString(content) {
    var buf = arrayBuffer.fromString(content);
    return Blob.createFromArrayBuffer(buf);
};

Blob.encode = function(blob) {
    return {
        byteLength: blob.getByteLength(),
        content: blob.getAsBase64()
    };
};

Blob.decode = function(json) {
    var properties = {};
    if(json.content) {
        properties.content = arrayBuffer.fromBase64(json.content);
    }
    properties.byteLength = json.byteLength;

    return new Blob(properties);
};

module.exports = Blob;
