const should = require('should');

const Blob = require('../src/models/blob');

describe('Blob', function() {
    it('should fail creating a blob too big', function() {
        should.throws(function() {
            const ab = new ArrayBuffer(256 * 1024 * 1024);
            Blob.createFromArrayBuffer(ab);
        });
    });
});

