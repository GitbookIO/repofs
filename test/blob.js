const should = require('should');

const Blob = require('../src/models/blob');

describe('Blob', () => {
    it('should fail creating a blob too big', () => {
        should.throws(() => {
            const ab = new ArrayBuffer(256 * 1024 * 1024);
            Blob.createFromArrayBuffer(ab);
        });
    });
});

