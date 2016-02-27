var Buffer = require('buffer').Buffer;

var arrayBuffer = require('../lib/utils/arraybuffer');

describe('ArrayBuffer', function() {

    it('should correctly enforce a base64 from a string', function() {
        arrayBuffer.enforceBase64('test').should.equal('dGVzdA==');
    });

    it('should correctly enforce a string from a buffer', function() {
        var b = new Buffer('dGVzdA==', 'base64');
        arrayBuffer.enforceString(b).should.equal('test');
    });

});

