require('should');

var _ = require('lodash');

var repofs = require('../');
var DirUtils = repofs.DirUtils;
var bufferUtils = require('../lib/utils/arraybuffer');
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

    describe('.readRecursive', function() {

        it('should list files recursively from root', function() {
            var files = DirUtils.readRecursive(NESTED_DIRECTORY, '.');
            _.difference(INITIAL_FILES, files).should.be.empty();
        });

        it('should list files recursively from dir', function() {
            var filesDeep = DirUtils.readRecursive(NESTED_DIRECTORY, 'dir/');
            _.difference([
                'dir/file1',
                'dir/file2',
            ], filesDeep).should.be.empty();
        });

        it('should be flexible with paths', function() {
            var pathsToTest = [
                'dir.deep',
                'dir.deep/',
                './dir.deep/',
            ].map(function(path) {
                return DirUtils.readRecursive(NESTED_DIRECTORY, path);
            }).map(function (files) {
                _.difference([
                    'dir.deep/file1',
                    'dir.deep/dir/file1'
                ], files).should.be.empty();
            });
        });
    });

    describe('.read', function() {
        it('should shallow list root files', function() {
            var files = DirUtils.read(NESTED_DIRECTORY, './');
            _.difference(['file.root'], files).should.be.empty();
        });

        it('should shallow list all files in a dir', function() {
            var files = DirUtils.read(NESTED_DIRECTORY, 'dir');
            _.difference([
                'dir/file1',
                'dir/file2',
            ], files).should.be.empty();
        });

        it('should shallow list all files and dir in a dir', function() {
            var files = DirUtils.read(NESTED_DIRECTORY, './dir.deep/');
            console.log(files);
            _.difference([
                'dir.deep/file1',
                'dir.deep/dir',
            ], files).should.be.empty();
        });
    });

    describe('.move', function() {
    });

    describe('.remove', function() {
    });
});
