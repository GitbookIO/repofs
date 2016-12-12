const Buffer = require('buffer').Buffer;
const is = require('is');

/**
 * Test if is arraybuffer
 */
function isArrayBuffer(b) {
    return Object.prototype.toString.call(b) === '[object ArrayBuffer]';
}
function isBuffer(b) {
    return Object.prototype.toString.call(b) === '[object Buffer]';
}

/**
 * Convert from a string
 */
function fromString(str, encoding) {
    return fromBuffer(new Buffer(str, encoding || 'utf8'));
}

/**
 * Convert from a base64 string
 */
function fromBase64(str) {
    return fromString(str, 'base64');
}

/**
 * Convert from a buffer to an ArrayBuffer
 */
function fromBuffer(buffer) {
    const ab = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

/**
 * Convert to a buffer
 */
function toBuffer(ab) {
    const buffer = new Buffer(ab.byteLength);
    const view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

/**
 * Force conversion to a Base64 string
 */
function enforceBase64(b) {
    return enforceBuffer(b).toString('base64');
}

/**
 * Force conversion to a buffer
 */
function enforceBuffer(b) {
    if (isArrayBuffer(b)) return toBuffer(b);
    else return new Buffer(b);
}

/**
 * Force conversion to an arraybuffer
 */
function enforceArrayBuffer(b, encoding) {
    if (isArrayBuffer(b)) return b;
    else if (isBuffer(b)) return fromBuffer(b);
    else return fromString(b, encoding);
}

/**
 * Force conversion to string with specific encoding
 */
function enforceString(b, encoding) {
    if (is.string(b)) return b;
    if (isArrayBuffer(b)) b = toBuffer(b);

    return b.toString(encoding);
}

/**
 * Tests equality of two ArrayBuffer
 * @param {ArrayBuffer} buf1
 * @param {ArrayBuffer} buf2
 * @return {Boolean}
 */
function equals(buf1, buf2) {
    if (buf1.byteLength != buf2.byteLength) return false;
    const dv1 = new Int8Array(buf1);
    const dv2 = new Int8Array(buf2);
    for (let i = 0 ; i != buf1.byteLength ; i++) {
        if (dv1[i] != dv2[i]) return false;
    }
    return true;
}

const BufferUtils = {
    equals,
    fromBuffer,
    fromString,
    fromBase64,
    toBuffer,
    toBase64: enforceBase64,
    enforceBase64,
    enforceBuffer,
    enforceArrayBuffer,
    enforceString
};

module.exports = BufferUtils;
