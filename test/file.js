require('should');

var repofs = require('../');
var bufferUtils = require('../lib/utils/arraybuffer');
var FileUtils = repofs.FileUtils;
var mock = require('./mock');

describe('FileUtils', function() {
    var DEFAULT_BOOK = mock.DEFAULT_BOOK;

    describe('.exists', function() {

        it('should true if file exists', function() {
            FileUtils.exists(DEFAULT_BOOK, 'README.md').should.equal(true);
            FileUtils.exists(DEFAULT_BOOK, 'SUMMARY.md').should.equal(true);
        });

        it('should false if file does not exists', function() {
            FileUtils.exists(DEFAULT_BOOK, 'Notexist.md').should.equal(false);
            FileUtils.exists(DEFAULT_BOOK, 'dir/SUMMARY.md').should.equal(false);
        });

    });

    describe('.read', function() {
        it('should read content as ArrayBuffer if file exists', function() {
            var read = FileUtils.read(DEFAULT_BOOK, 'README.md');
            read.should.be.an.instanceof(ArrayBuffer);
            bufferUtils.enforceString(read).should.equal('# Introduction');
        });

        it('should read content as ArrayBuffer for modified files', function() {
            var modifiedState = FileUtils.write(DEFAULT_BOOK, 'README.md', 'New');
            var read = FileUtils.read(modifiedState, 'README.md');
            read.should.be.an.instanceof(ArrayBuffer);
            bufferUtils.enforceString(read).should.equal('New');
        });

        it('should throw File Not Found when file does not exist', function() {
            (function readUnknown() {
                FileUtils.read(DEFAULT_BOOK, 'Notexist.md');
            }).should.throw(Error, { code: repofs.ERROR.NOT_FOUND });
        });
    });

    describe('.readAsString', function() {
        it('should read content as String if file exists', function() {
            var read = FileUtils.readAsString(DEFAULT_BOOK, 'SUMMARY.md');
            read.should.be.equal('# Summary');
        });

        it('should throw File Not Found when file does not exist', function() {
            (function readUnknown() {
                FileUtils.readAsString(DEFAULT_BOOK, 'Notexist.md');
            }).should.throw(Error, { code: repofs.ERROR.NOT_FOUND });
        });
    });

    describe('.create', function() {
        it('should create a file if it does not exist', function() {
            var repoState = FileUtils.create(DEFAULT_BOOK, 'New', 'New Content');
            FileUtils.exists(repoState, 'New').should.be.true();
            FileUtils.readAsString(repoState, 'New').should.be.equal('New Content');
        });

        it('should throw File Already Exists when file does exist', function() {
            (function createExisting() {
                FileUtils.create(DEFAULT_BOOK, 'README.md', '');
            }).should.throw(Error, { code: repofs.ERROR.ALREADY_EXIST });
        });
    });

    describe('.write', function() {
        it('should write a file if it exists', function() {
            var repoState = FileUtils.write(DEFAULT_BOOK, 'README.md', 'New Content');
            FileUtils.readAsString(repoState, 'README.md').should.be.equal('New Content');
        });

        it('should throw File Not Found when file does not exist', function() {
            (function writeAbsent() {
                FileUtils.write(DEFAULT_BOOK, 'Notexist.md', '');
            }).should.throw(Error, { code: repofs.ERROR.NOT_FOUND });
        });
    });

    describe('.remove', function() {
        it('should remove a file if it exists', function() {
            var repoState = FileUtils.remove(DEFAULT_BOOK, 'README.md');
            FileUtils.exists(repoState, 'README.md').should.equal(false);
        });

        it('should throw File Not Found when file does not exist', function() {
            (function removeAbsent() {
                FileUtils.remove(DEFAULT_BOOK, 'Notexist.md');
            }).should.throw(Error, { code: repofs.ERROR.NOT_FOUND });
        });
    });
});
