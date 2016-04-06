var immutable = require('immutable');

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
    // Map<Path, TreeNode> With relative paths. Empty for non directory
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
 * @param {Map<Path, TreeNode} tree
 * @param {Path} treePath The absolute path of the tree. Empty for root.
 * @param {Array<String>} keyPath The path at which the node should be. Cannot be empty.
 * @param {TreeNode} node
 * @param {Boolean} [mutable=false] To use mutable instance of Map in created directories.
 * @return {Map<Path, TreeNode}
 */
function setInTree(tree, treePath, keyPath, node, mutable) {
    if(keyPath.length === 0) {
        throw new Error('Expect a non-empty path to insert node \''
                        + node.getPath()
                        + '\' in tree');
    } else if (keyPath.length === 1) {
        // Insert here
        return tree.set(keyPath[0], node);
    } else {
        // Insert deeper
        var deeperTreePath = treePath+'/'+keyPath[0];
        var exists = tree.has(keyPath[0]);
        var children;

        if (!exists) {
            // Create children for subdirectory
            children = new immutable.Map();
            if (mutable) children = children.asMutable();
        } else {
            children = tree.get(keyPath[0]).getChildren();
        }
        // Add the node deeper
        children = setInTree(children, deeperTreePath, keyPath.slice(1), node, mutable);

        var treeNode;
        if (!exists) {
            // Create a directory node
            treeNode = new TreeNode({
                path: deeperTreePath,
                isDirectory: true,
                children: children
            });
        } else {
            // Update directory node
            treeNode = tree.get(keyPath[0]).set('children', children);
        }

        return tree.set(keyPath[0], treeNode);
    }
}

/**
 * Generate a files tree from the current branch, taking pending changes into account.
 * @param {RepositoryState} repoState
 * @param {Path} [dir=''] The directory to get the subtree from, default to root
 * @return {Map<Path, TreeNode>} The children of the directory
 */
function get(repoState, dirPath) {
    var mergedFileSet = WorkingUtils.getMergedFileSet(repoState.getCurrentState(), dirPath);

    var mutableTree = mergedFileSet.reduce(function (mutableTree, filePath) {
        var node = TreeNode.createFile(filePath);
        var keyPath = filePath.split('/');
        var mutable = true;
        return setInTree(mutableTree, dirPath, keyPath, node, mutable);
    }, new immutable.Map().asMutable());

    // Make immutable the children Map of created directories
    var immutableTree = (function deepImmutable(treeMap) {
        return treeMap.map(function (node) {
            if(node.isDirectory()) {
                return node.set('children', deepImmutable(node.getChildren()));
            } else {
                return node;
            }
        }).asImmutable();
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
