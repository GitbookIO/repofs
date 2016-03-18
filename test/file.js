require('should');

var repofs = require('../');
var bufferUtils = require('../lib/utils/arraybuffer');
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
            bufferUtils.enforceString(read).should.equal('# Introduction');
        });

        it('should read content as ArrayBuffer for modified files', function() {
            var modifiedState = FileUtils.write(defaultBook, 'README.md', 'New');
            var read = FileUtils.read(modifiedState, 'README.md');
            read.should.be.an.instanceof(ArrayBuffer);
            bufferUtils.enforceString(read).should.equal('New');
        });

        it('should throw File Not Found when file does not exist', function() {
            (function readUnknown() {
                FileUtils.read(defaultBook, 'Notexist.md');
            }).should.throw(Error, { code: repofs.ERROR.NOT_FOUND });
        });
    });

    describe('.readAsString', function() {
        it('should read content as String if file exists', function() {
            var read = FileUtils.readAsString(defaultBook, 'SUMMARY.md');
            read.should.be.equal('# Summary');
        });

        it('should throw File Not Found when file does not exist', function() {
            (function readUnknown() {
                FileUtils.readAsString(defaultBook, 'Notexist.md');
            }).should.throw(Error, { code: repofs.ERROR.NOT_FOUND });
        });
    });

    describe('.create', function() {
        it('should create a file if it does not exist', function() {
            var repoState = FileUtils.create(defaultBook, 'New', 'New Content');
            FileUtils.exists(repoState, 'New').should.be.true();
            FileUtils.readAsString(repoState, 'New').should.be.equal('New Content');
        });

        it('should throw File Already Exists when file does exist', function() {
            (function createExisting() {
                FileUtils.create(defaultBook, 'README.md', '');
            }).should.throw(Error, { code: repofs.ERROR.ALREADY_EXIST });
        });
    });

    describe('.write', function() {
        it('should write a file if it exists', function() {
            var repoState = FileUtils.write(defaultBook, 'README.md', 'New Content');
            FileUtils.readAsString(repoState, 'README.md').should.be.equal('New Content');
        });

        it('should throw File Not Found when file does not exist', function() {
            (function writeAbsent() {
                FileUtils.write(defaultBook, 'Notexist.md', '');
            }).should.throw(Error, { code: repofs.ERROR.NOT_FOUND });
        });
    });

    describe('.remove', function() {
        it('should remove a file if it exists', function() {
            var repoState = FileUtils.remove(defaultBook, 'README.md');
            FileUtils.exists(repoState, 'README.md').should.equal(false);
        });

        it('should throw File Not Found when file does not exist', function() {
            (function removeAbsent() {
                FileUtils.remove(defaultBook, 'Notexist.md');
            }).should.throw(Error, { code: repofs.ERROR.NOT_FOUND });
        });
    });
});
