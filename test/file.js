var should = require('should');

var repofs = require('../');
var Blob = require('../lib/models/blob');
var File = require('../lib/models/file');
var FileUtils = repofs.FileUtils;
var FILE_TYPE = require('../lib/constants/filetype.js');

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
        it('should read content as Blob if file exists', function() {
            var blob = FileUtils.read(DEFAULT_BOOK, 'README.md');
            blob.should.be.an.instanceof(Blob);
            blob.getAsString().should.equal('# Introduction');
        });

        it('should read content as Blob for modified files', function() {
            var modifiedState = FileUtils.write(DEFAULT_BOOK, 'README.md', 'New');
            var blob = FileUtils.read(modifiedState, 'README.md');
            blob.should.be.an.instanceof(Blob);
            blob.getAsString().should.equal('New');
        });

        it('should throw File Not Found when file does not exist', function() {
            (function readUnknown() {
                FileUtils.read(DEFAULT_BOOK, 'Notexist.md');
            }).should.throw(Error, { code: repofs.ERRORS.NOT_FOUND });
        });
    });

    describe('.stat', function() {
        it('should return a File without content when not fetched', function() {
            var repo = mock.addFile(DEFAULT_BOOK, 'notfetched.txt', {
                fetched: false
            });
            var file = FileUtils.stat(repo, 'notfetched.txt');
            file.should.be.an.instanceof(File);
            file.getFileSize().should.equal(14);
            file.isDirectory().should.be.false();
            file.getPath().should.equal('notfetched.txt');
            file.getType().should.equal(FILE_TYPE.FILE);
            file.getMime().should.equal('text/plain');
            should(file.getContent()).not.be.ok();
        });

        it('should return a File with content when fetched', function() {
            var repo = mock.addFile(DEFAULT_BOOK, 'fetched.txt', {
                fetched: true
            });
            var file = FileUtils.stat(repo, 'fetched.txt');
            file.getFileSize().should.equal(11);
            file.getContent().getAsString().should.equal('fetched.txt');
        });

        it('should return a File with content when there is a change', function() {
            var repo = FileUtils.create(DEFAULT_BOOK, 'created', 'content');
            var file = FileUtils.stat(repo, 'created');
            file.getContent().getAsString().should.equal('content');
        });

        it('should return a File with content when there is a change with known sha', function() {
            var readmeBlob = FileUtils.read(DEFAULT_BOOK, 'README.md');
            var repo = FileUtils.move(DEFAULT_BOOK, 'README.md', 'renamed');
            var file = FileUtils.stat(repo, 'renamed');
            file.getContent().getAsString().should.equal(readmeBlob.getAsString());
        });

        it('should return a File without content when there is a change with known sha, but not fetched', function() {
            var repo = mock.addFile(DEFAULT_BOOK, 'created', {
                fetched: false
            });
            repo = FileUtils.move(repo, 'created', 'renamed');
            var file = FileUtils.stat(repo, 'renamed');
            file.getFileSize().should.equal(7);
            should(file.getContent()).not.be.ok();
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
            }).should.throw(Error, { code: repofs.ERRORS.NOT_FOUND });
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
            }).should.throw(Error, { code: repofs.ERRORS.ALREADY_EXIST });
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
            }).should.throw(Error, { code: repofs.ERRORS.NOT_FOUND });
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
            }).should.throw(Error, { code: repofs.ERRORS.NOT_FOUND });
        });
    });

    describe('.hasChanged', function() {
        it('should detect that an existing file has not changed', function() {
            var state1 = DEFAULT_BOOK;
            var state2 = DEFAULT_BOOK;
            FileUtils.hasChanged(state1, state2, 'README.md').should.be.false();
        });

        it('should detect that a non existing file has not changed', function() {
            var state1 = DEFAULT_BOOK;
            var state2 = DEFAULT_BOOK;
            FileUtils.hasChanged(state1, state2, 'does_not_exist.md').should.be.false();
        });

        it('should detect that an added file has changed', function() {
            var state1 = DEFAULT_BOOK;
            var state2 = FileUtils.create(DEFAULT_BOOK, 'created');
            FileUtils.hasChanged(state1, state2, 'created').should.be.true();
        });

        it('should detect that a removed file has changed', function() {
            var state1 = DEFAULT_BOOK;
            var state2 = FileUtils.remove(DEFAULT_BOOK, 'README.md');
            FileUtils.hasChanged(state1, state2, 'README.md').should.be.true();
        });

        it('should detect when the content of a file has changed', function() {
            var state1 = FileUtils.create(DEFAULT_BOOK, 'created', 'content1');
            var state2 = FileUtils.write(state1, 'created', 'content2');
            FileUtils.hasChanged(state1, state2, 'created').should.be.true();
        });

        it('should detect when a created file has not changed', function() {
            var state1 = FileUtils.create(DEFAULT_BOOK, 'created', 'content1');
            var state2 = FileUtils.write(state1, 'created', 'content1');
            FileUtils.hasChanged(state1, state2, 'created').should.be.false();
        });
    });
});
