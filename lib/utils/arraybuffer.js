var _ = require('lodash');
var Buffer = require('buffer').Buffer;

// Test if is arraybuffer
function isArrayBuffer(b) {
    return Object.prototype.toString.call(b) === '[object ArrayBuffer]';
}
function isBuffer(b) {
    return Object.prototype.toString.call(b) === '[object Buffer]';
}

// Convert from a string
function fromString(str, encoding) {
    return fromBuffer(new Buffer(str, encoding || 'utf8'));
}

// Convert from a base64 string
function fromBase64(str) {
    return fromString(str, 'base64');
}

// Convert from a buffer to an ArrayBuffer
function fromBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

// Convert to a buffer
function toBuffer(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

// Force conversion to a Base64 string
function enforceBase64(b) {
    return enforceBuffer(b).toString('base64');
}

// Force conversion to a buffer
function enforceBuffer(b) {
    if (isArrayBuffer(b)) return toBuffer(b);
    else return new Buffer(b);
}

// Force conversion to an arraybuffer
function enforceArrayBuffer(b, encoding) {
    if (isArrayBuffer(b)) return b;
    else if (isBuffer(b)) return fromBuffer(b);
    else return fromString(b, encoding);
}

// Force conversion to string with specific encoding
function enforceString(b, encoding) {
    if (_.isString(b)) return b;
    if (isArrayBuffer(b)) b = toBuffer(b);

    return b.toString(encoding);
}

module.exports = {
    fromBuffer: fromBuffer,
    fromString: fromString,
    fromBase64: fromBase64,
    toBuffer: toBuffer,
    toBase64: enforceBase64,
    enforceBase64: enforceBase64,
    enforceBuffer: enforceBuffer,
    enforceArrayBuffer: enforceArrayBuffer,
    enforceString: enforceString
};
