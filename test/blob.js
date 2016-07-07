var should = require('should');

var Blob = require('../lib/models/blob');

describe('Blob', function() {
    it('should fail creating a blob too big', function() {
        should.throws(function() {
            var ab = new ArrayBuffer(256*1024*1024);
            Blob.createFromArrayBuffer(ab);
        });
    });
});

