const Immutable = require('immutable');

const arrayBuffer = require('../utils/arraybuffer');
const ERRORS = require('../constants/errors');

// Don't read blob over 1MB
const BLOB_MAX_SIZE = 1 * 1024 * 1024;

const Blob = Immutable.Record({
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
 * Test equality to another Blob
 * @return {Boolean}
 */
// TODO implement and use Blob.prototype.hashCode, since Immutable
// will assume hashCodes are equals when equals returns true.
Blob.prototype.equals = function(blob) {
    return this.getByteLength() === blob.getByteLength()
        && arrayBuffer.equals(this.getContent(), blob.getContent());
};

// ---- Static ----

/**
 * Create a blob from a string or buffer, returns null if blob is too big
 * @param  {String|Buffer|ArrayBuffer} buf
 * @return {?Blob}
 */
Blob.create = function create(buf) {
    if (buf instanceof Blob) {
        return buf;
    }

    return Blob.createFromArrayBuffer(arrayBuffer.enforceArrayBuffer(buf));
};

/**
 * Create a blob from an array buffer, returns null if blob is too big
 * @param  {ArrayBuffer} buf
 * @return {?Blob}
 */
Blob.createFromArrayBuffer = function createFromArrayBuffer(buf) {
    const isTooBig = (buf.byteLength > BLOB_MAX_SIZE);

    if (isTooBig) {
        const err = new Error('File content is too big to be processed');
        err.code = ERRORS.BLOB_TOO_BIG;

        throw err;
    }

    return new Blob({
        byteLength: buf.byteLength,
        content:    buf
    });
};

/**
 * Create a blob from a base64 string, returns null if blob is too big
 * @param  {String} content
 * @return {?Blob}
 */
Blob.createFromBase64 = function createFromBase64(content) {
    const buf = arrayBuffer.fromBase64(content);
    return Blob.createFromArrayBuffer(buf);
};

/**
 * Create a blob from a buffer, returns null if blob is too big
 * @param  {String} content
 * @return {?Blob}
 */
Blob.createFromBuffer = function createFromBuffer(content) {
    const buf = arrayBuffer.fromBuffer(content);
    return Blob.createFromArrayBuffer(buf);
};

/**
 * Create a blob from a string, returns null if blob is too big
 * @param  {String} content
 * @return {?Blob}
 */
Blob.createFromString = function createFromString(content) {
    const buf = arrayBuffer.fromString(content);
    return Blob.createFromArrayBuffer(buf);
};

/**
 * Encode a blob to JSON
 * @param  {Blob} blob
 * @return {JSON}
 */
Blob.encode = function(blob) {
    return {
        byteLength: blob.getByteLength(),
        content: blob.getAsBase64()
    };
};

/**
 * Decode a blob from JSON
 * @param  {JSON} json
 * @return {Blob}
 */
Blob.decode = function(json) {
    const properties = {};
    if (json.content) {
        properties.content = arrayBuffer.fromBase64(json.content);
    }
    properties.byteLength = json.byteLength;

    return new Blob(properties);
};

module.exports = Blob;
