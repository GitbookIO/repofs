const should = require('should');

const repofs = require('../src/');
const Blob = require('../src/models/blob');
const File = require('../src/models/file');
const FileUtils = repofs.FileUtils;
const FILE_TYPE = require('../src/constants/filetype.js');

const mock = require('./mock');

describe('FileUtils', () => {
    const DEFAULT_BOOK = mock.DEFAULT_BOOK;

    describe('.exists', () => {

        it('should true if file exists', () => {
            FileUtils.exists(DEFAULT_BOOK, 'README.md').should.equal(true);
            FileUtils.exists(DEFAULT_BOOK, 'SUMMARY.md').should.equal(true);
        });

        it('should false if file does not exists', () => {
            FileUtils.exists(DEFAULT_BOOK, 'Notexist.md').should.equal(false);
            FileUtils.exists(DEFAULT_BOOK, 'dir/SUMMARY.md').should.equal(false);
        });

    });

    describe('.read', () => {
        it('should read content as Blob if file exists', () => {
            const blob = FileUtils.read(DEFAULT_BOOK, 'README.md');
            blob.should.be.an.instanceof(Blob);
            blob.getAsString().should.equal('# Introduction');
        });

        it('should read content as Blob for modified files', () => {
            const modifiedState = FileUtils.write(DEFAULT_BOOK, 'README.md', 'New');
            const blob = FileUtils.read(modifiedState, 'README.md');
            blob.should.be.an.instanceof(Blob);
            blob.getAsString().should.equal('New');
        });
    });

    describe('.stat', () => {
        it('should return a File without content when not fetched', () => {
            const repo = mock.addFile(DEFAULT_BOOK, 'notfetched.txt', {
                fetched: false
            });
            const file = FileUtils.stat(repo, 'notfetched.txt');
            file.should.be.an.instanceof(File);
            file.getFileSize().should.equal(14);
            file.isDirectory().should.be.false();
            file.getPath().should.equal('notfetched.txt');
            file.getType().should.equal(FILE_TYPE.FILE);
            file.getMime().should.equal('text/plain');
            should(file.getContent()).not.be.ok();
        });

        it('should return a File with content when fetched', () => {
            const repo = mock.addFile(DEFAULT_BOOK, 'fetched.txt', {
                fetched: true
            });
            const file = FileUtils.stat(repo, 'fetched.txt');
            file.getFileSize().should.equal(11);
            file.getContent().getAsString().should.equal('fetched.txt');
        });

        it('should return a File with content when there is a change', () => {
            const repo = FileUtils.create(DEFAULT_BOOK, 'created', 'content');
            const file = FileUtils.stat(repo, 'created');
            file.getContent().getAsString().should.equal('content');
        });

        it('should return a File with content when there is a change with known sha', () => {
            const readmeBlob = FileUtils.read(DEFAULT_BOOK, 'README.md');
            const repo = FileUtils.move(DEFAULT_BOOK, 'README.md', 'renamed');
            const file = FileUtils.stat(repo, 'renamed');
            file.getContent().getAsString().should.equal(readmeBlob.getAsString());
        });

        it('should return a File without content when there is a change with known sha, but not fetched', () => {
            let repo = mock.addFile(DEFAULT_BOOK, 'created', {
                fetched: false
            });
            repo = FileUtils.move(repo, 'created', 'renamed');
            const file = FileUtils.stat(repo, 'renamed');
            file.getFileSize().should.equal(7);
            should(file.getContent()).not.be.ok();
        });
    });

    describe('.readAsString', () => {
        it('should read content as String if file exists', () => {
            const read = FileUtils.readAsString(DEFAULT_BOOK, 'SUMMARY.md');
            read.should.be.equal('# Summary');
        });
    });

    describe('.create', () => {
        it('should create a file if it does not exist', () => {
            const repoState = FileUtils.create(DEFAULT_BOOK, 'New', 'New Content');
            FileUtils.exists(repoState, 'New').should.be.true();
            FileUtils.readAsString(repoState, 'New').should.be.equal('New Content');
        });

        it('should throw File Already Exists when file does exist', () => {
            (function createExisting() {
                FileUtils.create(DEFAULT_BOOK, 'README.md', '');
            }).should.throw(Error, { code: repofs.ERRORS.ALREADY_EXIST });
        });
    });

    describe('.write', () => {
        it('should write a file if it exists', () => {
            const repoState = FileUtils.write(DEFAULT_BOOK, 'README.md', 'New Content');
            FileUtils.readAsString(repoState, 'README.md').should.be.equal('New Content');
        });

        it('should throw File Not Found when file does not exist', () => {
            (function writeAbsent() {
                FileUtils.write(DEFAULT_BOOK, 'Notexist.md', '');
            }).should.throw(Error, { code: repofs.ERRORS.NOT_FOUND });
        });
    });

    describe('.remove', () => {
        it('should remove a file if it exists', () => {
            const repoState = FileUtils.remove(DEFAULT_BOOK, 'README.md');
            FileUtils.exists(repoState, 'README.md').should.equal(false);
        });

        it('should throw File Not Found when file does not exist', () => {
            (function removeAbsent() {
                FileUtils.remove(DEFAULT_BOOK, 'Notexist.md');
            }).should.throw(Error, { code: repofs.ERRORS.NOT_FOUND });
        });
    });

    describe('.move', () => {
        it('should move a file if it exists', () => {
            const repoState = FileUtils.remove(DEFAULT_BOOK, 'README.md', 'README_NEW.md');
            FileUtils.exists(repoState, 'README.md').should.equal(false);
            FileUtils.exists(repoState, 'README_NEW.md').should.equal(false);
        });

        it('should throw File Not Found when file does not exist', () => {
            (function removeAbsent() {
                FileUtils.move(DEFAULT_BOOK, 'Notexist.md', 'Notexist_new.md');
            }).should.throw(Error, { code: repofs.ERRORS.NOT_FOUND });
        });
    });

    describe('.hasChanged', () => {
        it('should detect that an existing file has not changed', () => {
            const state1 = DEFAULT_BOOK;
            const state2 = DEFAULT_BOOK;
            FileUtils.hasChanged(state1, state2, 'README.md').should.be.false();
        });

        it('should detect that a non existing file has not changed', () => {
            const state1 = DEFAULT_BOOK;
            const state2 = DEFAULT_BOOK;
            FileUtils.hasChanged(state1, state2, 'does_not_exist.md').should.be.false();
        });

        it('should detect that an added file has changed', () => {
            const state1 = DEFAULT_BOOK;
            const state2 = FileUtils.create(DEFAULT_BOOK, 'created');
            FileUtils.hasChanged(state1, state2, 'created').should.be.true();
        });

        it('should detect that a removed file has changed', () => {
            const state1 = DEFAULT_BOOK;
            const state2 = FileUtils.remove(DEFAULT_BOOK, 'README.md');
            FileUtils.hasChanged(state1, state2, 'README.md').should.be.true();
        });

        it('should detect when the content of a file has changed', () => {
            const state1 = FileUtils.create(DEFAULT_BOOK, 'created', 'content1');
            const state2 = FileUtils.write(state1, 'created', 'content2');
            FileUtils.hasChanged(state1, state2, 'created').should.be.true();
        });

        it('should detect when a created file has not changed', () => {
            const state1 = FileUtils.create(DEFAULT_BOOK, 'created', 'content1');
            const state2 = FileUtils.write(state1, 'created', 'content1');
            FileUtils.hasChanged(state1, state2, 'created').should.be.false();
        });
    });
});
