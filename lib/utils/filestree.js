var Immutable = require('immutable');
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
        return Immutable.Seq([]);
    } else {
        return Immutable.Seq(path.split('/'));
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

    var tree = {
        value: File.createDir(normDirPath),
        children: {}
    };

    for (var i = 0; i < filepaths.length; i++) {
        var relativePath = Path.relative(normDirPath, filepaths[i]);
        var parts = relativePath.split('/');
        var node = tree;
        var prefix = normDirPath;
        for(var j = 0; j < parts.length; j++) {
            var head = parts[j];
            var isLeaf = (j === parts.length-1);
            prefix = Path.join(prefix, head);

            // Create node if doesn't exist
            if(!node.children[head]) {
                if (isLeaf) {
                    node.children[head] = {
                        value: FileUtils.stat(repoState, filepaths[i])
                    };
                } else {
                    node.children[head] = {
                        value: File.createDir(prefix),
                        children: {}
                    };
                }
            }
            node = node.children[head];
        }
    }

    return TreeNode.fromJS(tree);
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

    return !Immutable.is(previousFiles, newFiles);
}


var TreeUtils = {
    TreeNode: TreeNode,
    get: get,
    getInPath: getInPath,
    hasChanged: hasChanged
};
module.exports = TreeUtils;
