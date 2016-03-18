require('should');

var _ = require('lodash');

var repofs = require('../');
var DirUtils = repofs.DirUtils;
var bufferUtils = require('../lib/utils/arraybuffer');
var mock = require('./mock');

describe('DirUtils', function() {

    var INITIAL_FILES = [
        'file.root',
        'dir.twoItems/file1',
        'dir.twoItems/file2',
        'dir.deep.oneItem/file1',
        'dir.deep.oneItem/dir.oneItem/file1'
    ];

    var NESTED_DIRECTORY = mock.directoryStructure(INITIAL_FILES);

    describe('.readRecursive', function() {

        it('should list files recursively from root', function() {
            var files = DirUtils.readRecursive(NESTED_DIRECTORY, '.');
            _.difference(INITIAL_FILES, files).should.be.empty();
        });

    });

    describe('.read', function() {
    });

    describe('.move', function() {
    });

    describe('.remove', function() {
    });
});
