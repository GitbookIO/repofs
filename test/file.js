var should = require('should');

var repofs = require('../');
var FileUtils = repofs.FileUtils;
var mock = require('./mock');

describe('FileUtils', function() {
    var defaultBook = mock.defaultBook();

    describe('.exists', function() {

        it('should true if file exists', function() {
            FileUtils.exists(defaultBook, 'README.md').should.equal(true);
            FileUtils.exists(defaultBook, 'SUMMARY.md').should.equal(true);
        });

        it('should false if file does not exists', function() {
            FileUtils.exists(defaultBook, 'Notexist.md').should.equal(false);
            FileUtils.exists(defaultBook, 'dir/SUMMARY.md').should.equal(false);
        });

    });

    describe('.read', function() {
        it('should read content as ArrayBuffer if file exists', function() {
            var read = FileUtils.read(defaultBook, 'README.md');
            read.should.be.an.instanceof(ArrayBuffer);
            read.byteLength.should.equal(14);
        });
    });
});
