const should = require('should');

const Immutable = require('immutable');

const repofs = require('../src/');
const TreeUtils = repofs.TreeUtils;
const FileUtils = repofs.FileUtils;
const File = require('../src/models/file');
const mock = require('./mock');

describe('TreeUtils', () => {

    const INITIAL_FILES = [
        'file.root',
        'dir/file1',
        'dir/file2',
        'dir.deep/file1',
        'dir.deep/dir/file1'
    ];

    const REPO = mock.directoryStructure(INITIAL_FILES);

    describe('TreeNode', () => {
        const fileNode1 = createFileNode(REPO, 'dir/file1');
        const fileNode2 = createFileNode(REPO, 'dir/file2');
        let tree = createDirNode('.');

        let dir = createDirNode('dir');
        dir = dir.set('children', new Immutable.Map({
            file1: fileNode1,
            file2: fileNode2
        }));

        tree = tree.set('children', new Immutable.Map({
            dir
        }));


        describe('.getInPath', () => {
            it('should get a file in a TreeNode from a path', () => {
                const node = TreeUtils.getInPath(tree, 'dir/file1');
                Immutable.is(fileNode1, node).should.be.true();
            });

            it('should return null when not found', () => {
                const node = TreeUtils.getInPath(tree, 'dir/notfound');
                should(node).be.null();
            });

            it('should return the tree itself for root', () => {
                const node = TreeUtils.getInPath(tree, '.');
                Immutable.is(tree, node).should.be.true();
            });
        });
    });

    describe('.get', () => {

        it('should create a tree from an empty repo', () => {
            const tree = TreeUtils.get(mock.emptyRepo(), '');
            const file = tree.getValue();
            file.getPath().should.eql('.');
            file.isDirectory().should.be.true();
            tree.getChildren().isEmpty().should.be.true();
        });

        it('should create a tree from a flat structure of files', () => {
            const tree = TreeUtils.get(REPO, 'dir');
            const file = tree.getValue();
            file.getPath().should.eql('dir');
            file.isDirectory().should.be.true();

            const children = tree.getChildren();
            const expected = Immutable.Map({
                file1: createFileNode(REPO, 'dir/file1'),
                file2: createFileNode(REPO, 'dir/file2')
            });

            Immutable.is(expected, children).should.be.true();
        });

        it('should create a tree from root', () => {
            const tree = TreeUtils.get(REPO, '');
            const node = TreeUtils.getInPath(tree, 'dir/file1');
            const expectedNode = createFileNode(REPO, 'dir/file1');
            Immutable.is(expectedNode, node).should.be.true();
        });

        it('should create Immutable objects', () => {
            const tree = TreeUtils.get(REPO, '');
            const node = TreeUtils.getInPath(tree, 'dir');
            // Add a file
            node.getChildren().set('modified', createDirNode(REPO, 'dir/modified'));
            // Should not appear in original tree
            should(TreeUtils.getInPath(tree, 'dir/modified')).be.null();
        });
    });

    describe('.hasChanged', () => {
        it('should detect when file structure has NOT changed', () => {
            const updatedFile = FileUtils.write(REPO, 'dir/file1', 'Content updated');
            TreeUtils.hasChanged(REPO, updatedFile).should.be.false();
        });

        it('should detect when file structure has changed', () => {
            const removedFile = FileUtils.remove(REPO, 'dir/file1');
            TreeUtils.hasChanged(REPO, removedFile).should.be.true();
        });
    });

    describe('should be performant', () => {
        function timeIt(N, maxMS, func) {
            return function() {
                const t1 = Date.now();
                for (let i = 0; i < N; i++) {
                    func.call(this);
                }
                const t2 = Date.now();
                const ms = (t2 - t1) / N;
                should(ms).be.below(maxMS);
            };
        }

        // 5 files at depth 200
        const DEEP = mock.directoryStructure(mock.bigFileList(5, 200));
        // 200 files at depth 5
        const WIDE = mock.directoryStructure(mock.bigFileList(200, 5));
        // 50 files at depth 100
        const DEEP_WIDE = mock.directoryStructure(mock.bigFileList(50, 50));

        it('to create tree from a deep repo', timeIt(20, 200, function deep(done) {
            this.timeout(10000);
            TreeUtils.get(DEEP, '.');
        }));
        it('to create tree from a wide repo', timeIt(20, 200, function wide(done) {
            this.timeout(10000);
            TreeUtils.get(WIDE, '.');
        }));
        it('to create tree from a deep and wide repo', timeIt(20, 400, function deepwide(done) {
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
