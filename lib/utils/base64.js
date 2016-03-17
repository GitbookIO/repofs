var Buffer = require('buffer').Buffer;

function encode(s) {
    return (new Buffer(s)).toString('base64');
}

function decode(s, encoding) {
    return (new Buffer(s, 'base64')).toString(encoding || 'utf8');
}

module.exports = {
    encode: encode,
    decode: decode
};
