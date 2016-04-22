var immutable = require('immutable');
var _ = require('lodash');
var Path = require('path');

var File = require('../models/file');
var TreeNode = require('./treeNode');
var DirUtils = require('./directory');
var FileUtils = require('./file');
var WorkingUtils = require('./working');

/**
 * Utils to create tree structures for files.
 */

/**
 * Convert a filepath to a Seq<String> to use as key path
 * @param {Path} path
 * @return {Seq<String>}
 */
function pathToKeySeq(path) {
    // Remove trailing '/' etc.
    path = Path.join(path, '.');
    if (path === '.') {
        return immutable.Seq([]);
    } else {
        return immutable.Seq(path.split('/'));
    }
}


/**
 * Find a node at the given path in a TreeNode of Files.
 * @param {TreeNode<File>} tree
 * @param {Path} path
 * @return {TreeNode<File> | Null} null if no found
 */
function getInPath(tree, path) {
    return tree.getIn(pathToKeySeq(path));
}

/**
 * Generate a files tree from the current branch, taking pending changes into account.
 * @param {RepositoryState} repoState
 * @param {Path} [dir='.'] The directory to get the subtree from, default to root
 * @return {TreeNode<File>} The directory TreeNode with all its children
 */
function get(repoState, dirPath) {
    // Remove trailing '/' etc.
    var normDirPath = Path.join(dirPath, '.');
    var filepaths = DirUtils.readFilenamesRecursive(repoState, normDirPath);

    // Init empty mutable tree with root dir as root
    var mutableTree = TreeNode.createLeaf(File.createDir(normDirPath)).asMutable();

    // Add every file to the tree
    mutableTree = _.reduce(filepaths, function insertAll(mutableTree, filePath) {
        var node = TreeNode.createLeaf(FileUtils.stat(repoState, filePath));
        var keySeq = pathToKeySeq(Path.relative(normDirPath, filePath));
        return mutableTree.setIn(keySeq, node, {
            mutable: true,
            createValue: function createDir(parentTree, keySeq) {
                var dirPath = Path.join(parentTree.getValue().getPath(), keySeq.last());
                return File.createDir(dirPath);
            }
        });
    }, mutableTree);

    // Return as immutable
    return mutableTree.asImmutable();
}

/**
 * @param {RepositoryState} previousRepo
 * @param {RepositoryState} newRepo
 * @return {Boolean} True if the files structure changed.
 */
function hasChanged(previousRepo, newRepo, dir) {
    var previousWorking = previousRepo.getCurrentState();
    var newWorking = newRepo.getCurrentState();

    var previousFiles = WorkingUtils.getMergedFileSet(previousWorking);
    var newFiles = WorkingUtils.getMergedFileSet(newWorking);

    return !immutable.is(previousFiles, newFiles);
}


var TreeUtils = {
    TreeNode: TreeNode,
    get: get,
    getInPath: getInPath,
    hasChanged: hasChanged
};
module.exports = TreeUtils;
