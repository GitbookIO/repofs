var should = require('should');

var immutable = require('immutable');

var repofs = require('../');
var TreeUtils = repofs.TreeUtils;
var mock = require('./mock');

describe('TreeUtils', function() {

    describe('TreeNode', function() {
        var file1 = TreeUtils.TreeNode.createFile('dir/file1');
        var file2 = TreeUtils.TreeNode.createFile('dir/file2');
        var tree = TreeUtils.TreeNode.createDirectory('.');

        var dir = TreeUtils.TreeNode.createDirectory('dir');
        dir = dir.set('children', new immutable.Map({
            file1: file1,
            file2: file2
        }));

        tree = tree.set('children', new immutable.Map({
            dir: dir
        }));


        describe('.getIn', function() {
            it('should get a file in a TreeNode from a path', function () {
                var sample = tree.getIn('dir/file1');
                immutable.is(file1, sample).should.be.true();
            });

            it('should get a file in a TreeNode from a key array', function () {
                var sample = tree.getIn(['dir', 'file1']);
                immutable.is(file1, sample).should.be.true();
            });

            it('should return null when not found', function () {
                var sample = tree.getIn('dir/notfound');
                should(sample).be.null();
            });

            it('should return itself as root', function () {
                var sample = tree.getIn('.');
                immutable.is(tree, sample).should.be.true();
            });
        });
    });

    describe('.get', function() {

        var INITIAL_FILES = [
            'file.root',
            'dir/file1',
            'dir/file2',
            'dir.deep/file1',
            'dir.deep/dir/file1'
        ];

        var NESTED_DIRECTORY = mock.directoryStructure(INITIAL_FILES);

        it('should create a tree from an empty repo', function() {
            var tree = TreeUtils.get(mock.emptyRepo(), '');
            tree.getPath().should.eql('.');
            tree.isDirectory().should.be.true();
            tree.getChildren().isEmpty().should.be.true();
        });

        it('should create a tree from a flat structure of files', function() {
            var tree = TreeUtils.get(NESTED_DIRECTORY, 'dir');

            tree.getPath().should.eql('dir');
            tree.isDirectory().should.be.true();

            var children = tree.getChildren();
            var expected = immutable.Map({
                file1: TreeUtils.TreeNode.createFile('dir/file1'),
                file2: TreeUtils.TreeNode.createFile('dir/file2')
            });

            immutable.is(expected, children).should.be.true();
        });

        it('should create a tree from root', function() {
            var tree = TreeUtils.get(NESTED_DIRECTORY, '');
            var sample = tree.getIn('dir/file1');
            var expectedFile = TreeUtils.TreeNode.createFile('dir/file1');
            immutable.is(expectedFile, sample).should.be.true();
        });

        it('should create immutable objects', function() {
            var tree = TreeUtils.get(NESTED_DIRECTORY, '');
            var sample = tree.getIn('dir');
            // Add a file
            sample.getChildren().set('modified', TreeUtils.TreeNode.createFile('dir/modified'));
            // Should not appear in original tree
            should(tree.getIn('dir/modified')).be.null();
        });
    });
});
