var should = require('should');

var immutable = require('immutable');

var repofs = require('../');
var TreeUtils = repofs.TreeUtils;
var FileUtils = repofs.FileUtils;
var File = require('../lib/models/file');
var mock = require('./mock');

describe('TreeUtils', function() {

    var INITIAL_FILES = [
        'file.root',
        'dir/file1',
        'dir/file2',
        'dir.deep/file1',
        'dir.deep/dir/file1'
    ];

    var NESTED_DIRECTORY = mock.directoryStructure(INITIAL_FILES);

    describe('TreeNode', function() {
        var fileNode1 = createFileNode(NESTED_DIRECTORY, 'dir/file1');
        var fileNode2 = createFileNode(NESTED_DIRECTORY, 'dir/file2');
        var tree = createDirNode('.');

        var dir = createDirNode('dir');
        dir = dir.set('children', new immutable.Map({
            file1: fileNode1,
            file2: fileNode2
        }));

        tree = tree.set('children', new immutable.Map({
            dir: dir
        }));


        describe('.getInPath', function() {
            it('should get a file in a TreeNode from a path', function () {
                var node = TreeUtils.getInPath(tree, 'dir/file1');
                immutable.is(fileNode1, node).should.be.true();
            });

            it('should return null when not found', function () {
                var node = TreeUtils.getInPath(tree, 'dir/notfound');
                should(node).be.null();
            });

            it('should return the tree itself for root', function () {
                var node = TreeUtils.getInPath(tree, '.');
                immutable.is(tree, node).should.be.true();
            });
        });
    });

    describe('.get', function() {

        it('should create a tree from an empty repo', function() {
            var tree = TreeUtils.get(mock.emptyRepo(), '');
            var file = tree.getValue();
            file.getPath().should.eql('.');
            file.isDirectory().should.be.true();
            tree.getChildren().isEmpty().should.be.true();
        });

        it('should create a tree from a flat structure of files', function() {
            var tree = TreeUtils.get(NESTED_DIRECTORY, 'dir');
            var file = tree.getValue();
            file.getPath().should.eql('dir');
            file.isDirectory().should.be.true();

            var children = tree.getChildren();
            var expected = immutable.Map({
                file1: createFileNode(NESTED_DIRECTORY, 'dir/file1'),
                file2: createFileNode(NESTED_DIRECTORY, 'dir/file2')
            });

            immutable.is(expected, children).should.be.true();
        });

        it('should create a tree from root', function() {
            var tree = TreeUtils.get(NESTED_DIRECTORY, '');
            var node = TreeUtils.getInPath(tree, 'dir/file1');
            var expectedNode = createFileNode(NESTED_DIRECTORY, 'dir/file1');
            immutable.is(expectedNode, node).should.be.true();
        });

        it('should create immutable objects', function() {
            var tree = TreeUtils.get(NESTED_DIRECTORY, '');
            var node = TreeUtils.getInPath(tree, 'dir');
            // Add a file
            node.getChildren().set('modified', createDirNode(NESTED_DIRECTORY, 'dir/modified'));
            // Should not appear in original tree
            should(TreeUtils.getInPath(tree, 'dir/modified')).be.null();
        });
    });

    describe('.hasChanged', function() {
        it('should detect when file structure has NOT changed', function () {
            var updatedFile = FileUtils.write(NESTED_DIRECTORY, 'dir/file1', 'Content updated');
            TreeUtils.hasChanged(NESTED_DIRECTORY, updatedFile).should.be.false();
        });

        it('should detect when file structure has changed', function () {
            var removedFile = FileUtils.remove(NESTED_DIRECTORY, 'dir/file1');
            TreeUtils.hasChanged(NESTED_DIRECTORY, removedFile).should.be.true();
        });
    });
});

// Returns a TreeNode with no children, containing the given File as value
function createFileNode(repo, path) {
    return TreeUtils.TreeNode.createLeaf(FileUtils.stat(repo, path));
}
function createDirNode(path) {
    return TreeUtils.TreeNode.createLeaf(File.createDir(path));
}
