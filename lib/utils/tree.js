var immutable = require('immutable');
var Path = require('path');

var WorkingUtils = require('working');

/**
 * Utils to create tree structures for files.
 */

/**
 * Simple node for a file tree structure
 */
var TreeNode = immutable.Record({
    // Absolute path
    path: String(),
    isDirectory: false,
    // Map<String, TreeNode> With relative paths as keys. Empty for non directory
    children: new immutable.Map()
});

function getter(property) {
    return function () {
        return this.get(property);
    };
}
TreeNode.prototype.getPath = getter('path');
TreeNode.prototype.isDirectory = getter('isDirectory');
TreeNode.prototype.getChildren = getter('children');

/**
 * Creates a file tree node with given path
 */
TreeNode.prototype.createFile = function (path) {
    return new TreeNode({
        path: path
    });
};

/**
 * Insert a TreeNode in the given tree, creating subdirectories as necessary.
 * @param {TreeNode} tree
 * @param {Array<String>} keyPath The path at which the node should
 * be. An empty path will directly return the node.
 * @param {TreeNode} node
 * @param {Boolean} [mutable=false] To use mutable instance of Map in created directories.
 * @return {TreeNode}
 */
function setInTree(tree, keyPath, node, mutable) {
    if(keyPath.length === 0) {
        // Insert here
        return node;
    } else {
        // Insert in tree
        var deeperTreePath = Path.join(tree.getPath(), keyPath[0]);
        var exists = tree.has(keyPath[0]);

        // Find the node to insert into
        var subNode;
        if (!exists) {
            // Create children for subdirectory
            var children = new immutable.Map();
            if (mutable) children = children.asMutable();

            // Create a directory node
            subNode = new TreeNode({
                path: deeperTreePath,
                isDirectory: true,
                children: children
            });
        } else {
            // Update directory node
            subNode = tree.get(keyPath[0]);
        }

        var newSubNode = setInTree(subNode, deeperTreePath, keyPath.slice(1), node, mutable);
        return tree.set('children', tree.getChildren().set(keyPath[0], newSubNode));
    }
}

/**
 * Generate a files tree from the current branch, taking pending changes into account.
 * @param {RepositoryState} repoState
 * @param {Path} [dir=''] The directory to get the subtree from, default to root
 * @return {TreeNode} The directory TreeNode with all its children
 */
function get(repoState, dirPath) {
    // Remove trailing '/' etc.
    var normDirPath = Path.join(dirPath, '.');
    var mergedFileSet = WorkingUtils.getMergedFileSet(repoState.getCurrentState(), normDirPath);

    var mutableTree = new TreeNode({
        path: normDirPath,
        isDirectory: true,
        children: new immutable.Map().asMutable()
    });

    // Add every file to the tree
    mutableTree = mergedFileSet.reduce(function (mutableTree, filePath) {
        var node = TreeNode.createFile(filePath);
        var keyPath = filePath.split('/');
        var mutable = true;
        return setInTree(mutableTree, normDirPath, keyPath, node, mutable);
    }, mutableTree);

    // Make immutable the children Map of created directories
    var immutableTree = (function deepImmutable(tree) {
        if(tree.isDirectory()) {
            var children = tree.getChildren().map(deepImmutable).asImmutable();
            return tree.set('children', children);
        } else {
            return tree;
        }
    })(mutableTree);

    return immutableTree;
}

/**
 * @param {RepositoryState} previousRepo
 * @param {RepositoryState} newRepo
 * @param {Path} [dir=''] The directory to watch for change. Default to root.
 * @return {Boolean} True if the directory was removed/added or if its
 * file structure changed.
 */
function hasChanged(previousRepo, newRepo, dir) {
}

module.exports = {
    get: get,
    hasChanged: hasChanged
};
