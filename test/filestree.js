var should = require('should');

var Immutable = require('immutable');

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

    var REPO = mock.directoryStructure(INITIAL_FILES);

    describe('TreeNode', function() {
        var fileNode1 = createFileNode(REPO, 'dir/file1');
        var fileNode2 = createFileNode(REPO, 'dir/file2');
        var tree = createDirNode('.');

        var dir = createDirNode('dir');
        dir = dir.set('children', new Immutable.Map({
            file1: fileNode1,
            file2: fileNode2
        }));

        tree = tree.set('children', new Immutable.Map({
            dir: dir
        }));


        describe('.getInPath', function() {
            it('should get a file in a TreeNode from a path', function () {
                var node = TreeUtils.getInPath(tree, 'dir/file1');
                Immutable.is(fileNode1, node).should.be.true();
            });

            it('should return null when not found', function () {
                var node = TreeUtils.getInPath(tree, 'dir/notfound');
                should(node).be.null();
            });

            it('should return the tree itself for root', function () {
                var node = TreeUtils.getInPath(tree, '.');
                Immutable.is(tree, node).should.be.true();
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
            var tree = TreeUtils.get(REPO, 'dir');
            var file = tree.getValue();
            file.getPath().should.eql('dir');
            file.isDirectory().should.be.true();

            var children = tree.getChildren();
            var expected = Immutable.Map({
                file1: createFileNode(REPO, 'dir/file1'),
                file2: createFileNode(REPO, 'dir/file2')
            });

            Immutable.is(expected, children).should.be.true();
        });

        it('should create a tree from root', function() {
            var tree = TreeUtils.get(REPO, '');
            var node = TreeUtils.getInPath(tree, 'dir/file1');
            var expectedNode = createFileNode(REPO, 'dir/file1');
            Immutable.is(expectedNode, node).should.be.true();
        });

        it('should create Immutable objects', function() {
            var tree = TreeUtils.get(REPO, '');
            var node = TreeUtils.getInPath(tree, 'dir');
            // Add a file
            node.getChildren().set('modified', createDirNode(REPO, 'dir/modified'));
            // Should not appear in original tree
            should(TreeUtils.getInPath(tree, 'dir/modified')).be.null();
        });
    });

    describe('.hasChanged', function() {
        it('should detect when file structure has NOT changed', function () {
            var updatedFile = FileUtils.write(REPO, 'dir/file1', 'Content updated');
            TreeUtils.hasChanged(REPO, updatedFile).should.be.false();
        });

        it('should detect when file structure has changed', function () {
            var removedFile = FileUtils.remove(REPO, 'dir/file1');
            TreeUtils.hasChanged(REPO, removedFile).should.be.true();
        });
    });

    describe('should be performant', function() {
        function timeIt(N, maxMS, func) {
            return function () {
                var t1 = Date.now();
                for(var i = 0; i < N; i++) {
                    func.call(this);
                }
                var t2 = Date.now();
                var ms = (t2 - t1) / N;
                should(ms).be.below(maxMS);
            };
        }

        // 5 files at depth 200
        var DEEP = mock.directoryStructure(mock.bigFileList(5, 200));
        // 200 files at depth 5
        var WIDE = mock.directoryStructure(mock.bigFileList(200, 5));
        // 50 files at depth 100
        var DEEP_WIDE = mock.directoryStructure(mock.bigFileList(50, 50));

        it('to create tree from a deep repo', timeIt(20, 100, function deep(done) {
            this.timeout(10000);
            TreeUtils.get(DEEP, '.');
        }));
        it('to create tree from a wide repo', timeIt(20, 100, function wide(done) {
            this.timeout(10000);
            TreeUtils.get(WIDE, '.');
        }));
        it('to create tree from a deep and wide repo', timeIt(20, 200, function deepwide(done) {
            this.timeout(10000);
            TreeUtils.get(DEEP_WIDE, '.');
        }));
    });

});

// Returns a TreeNode with no children, containing the given File as value
function createFileNode(repo, path) {
    return TreeUtils.TreeNode.createLeaf(FileUtils.stat(repo, path));
}
function createDirNode(path) {
    return TreeUtils.TreeNode.createLeaf(File.createDir(path));
}
