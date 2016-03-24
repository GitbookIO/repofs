require('should');

var _ = require('lodash');

var repofs = require('../');
var DirUtils = repofs.DirUtils;
var FileUtils = repofs.FileUtils;
var mock = require('./mock');

describe('DirUtils', function() {

    var INITIAL_FILES = [
        'file.root',
        'dir/file1',
        'dir/file2',
        'dir.deep/file1',
        'dir.deep/dir/file1'
    ];

    var NESTED_DIRECTORY = mock.directoryStructure(INITIAL_FILES);

    describe('.readFilenamesRecursive', function() {

        it('should list files recursively from root', function() {
            var files = DirUtils.readFilenamesRecursive(NESTED_DIRECTORY, '.');
            _.difference(INITIAL_FILES, files).should.be.empty();
        });

        it('should list files recursively from dir', function() {
            var filesDeep = DirUtils.readFilenamesRecursive(NESTED_DIRECTORY, 'dir/');
            _.difference([
                'dir/file1',
                'dir/file2'
            ], filesDeep).should.be.empty();
        });

        it('should be flexible with paths', function() {
            [
                'dir.deep',
                'dir.deep/',
                './dir.deep/'
            ].map(function(path) {
                return DirUtils.readFilenamesRecursive(NESTED_DIRECTORY, path);
            }).map(function (files) {
                _.difference([
                    'dir.deep/file1',
                    'dir.deep/dir/file1'
                ], files).should.be.empty();
            });
        });
    });

    describe('.readFilenames', function() {
        it('should shallow list root files', function() {
            var files = DirUtils.readFilenames(NESTED_DIRECTORY, './');
            _.difference(['file.root'], files).should.be.empty();
        });

        it('should shallow list all files in a dir', function() {
            var files = DirUtils.readFilenames(NESTED_DIRECTORY, 'dir');
            _.difference([
                'dir/file1',
                'dir/file2'
            ], files).should.be.empty();
        });

        it('should shallow list all files and dir in a dir', function() {
            var files = DirUtils.readFilenames(NESTED_DIRECTORY, './dir.deep/');
            _.difference([
                'dir.deep/file1',
                'dir.deep/dir'
            ], files).should.be.empty();
        });
    });

    describe('.move', function() {
        it('should be able to rename a dir', function() {
            var renamedRepo = DirUtils.move(NESTED_DIRECTORY, 'dir', 'newName');

            var files = DirUtils.readFilenamesRecursive(renamedRepo, '.');
            _.difference([
                'file.root',
                'newName/file1',
                'newName/file2',
                'dir.deep/file1',
                'dir.deep/dir/file1'
            ], files).should.be.empty();
        });

        it('should be kind with the cache (keeping SHAs when possible)', function() {
            var renamedRepo = DirUtils.move(NESTED_DIRECTORY, 'dir', 'newName');

            // The read should not fail because the content should be fetched
            FileUtils.readAsString(renamedRepo, 'newName/file1')
                .should.equal('dir/file1'); // original content
        });
    });

    describe('.remove', function() {
        it('should be able to remove a dir', function() {
            var removedRepo = DirUtils.remove(NESTED_DIRECTORY, 'dir.deep');

            var files = DirUtils.readFilenamesRecursive(removedRepo, '.');
            _.difference([
                'file.root',
                'dir/file1',
                'dir/file2'
            ], files).should.be.empty();
        });
    });
});
