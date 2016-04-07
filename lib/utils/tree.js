var immutable = require('immutable');
var _ = require('lodash');
var Path = require('path');

var DirUtils = require('./directory');
var WorkingUtils = require('./working');

/**
 * Utils to create tree structures for files.
 */

/**
 * Simple node for a file tree structure
 */
var TreeNode = immutable.Record({
    // Absolute path
    path: String(),
    // Is a directory ?
    directory: false,
    // Map<String, TreeNode> With relative paths as keys. Empty for non directory
    children: new immutable.Map()
});

function getter(property) {
    return function () {
        return this.get(property);
    };
}
TreeNode.prototype.getPath = getter('path');
TreeNode.prototype.isDirectory = getter('directory');
TreeNode.prototype.getChildren = getter('children');

/**
 * Get the TreeNode at the given relative path
 * @param {Path | Array<String>} path
 * @return {TreeNode | Null} null if not found
 */
TreeNode.prototype.getIn = function (path) {
    // Convert to Array if needed
    if (!(path instanceof Array)) {
        // Remove trailing '/' etc.
        path = Path.join(path, '.');
        if (path === '.') {
            path = [];
        } else {
            path = path.split('/');
        }
    }
    // path is now an Array<String>

    if (path.length === 0) {
        return this;
    } else {
        var children = this.getChildren();
        if (children.has(path[0])) {
            return children.get(path[0]).getIn(path.slice(1));
        } else {
            return null;
        }
    }
};

/**
 * Creates a file TreeNode with given path
 */
TreeNode.createFile = function (path) {
    return new TreeNode({
        path: path
    });
};

/**
 * Creates a directory TreeNode with given path
 */
TreeNode.createDirectory = function (path) {
    return new TreeNode({
        path: path,
        directory: true
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
        var exists = tree.getChildren().has(keyPath[0]);

        // Find the node to insert into
        var subNode;
        if (!exists) {
            // Create children for subdirectory
            var children = new immutable.Map();
            if (mutable) children = children.asMutable();

            // Create a directory node
            var deeperTreePath = Path.join(tree.getPath(), keyPath[0]);
            subNode = new TreeNode({
                path: deeperTreePath,
                directory: true,
                children: children
            });
        } else {
            // Update directory node
            subNode = tree.getChildren().get(keyPath[0]);
        }

        var newSubNode = setInTree(subNode, keyPath.slice(1), node, mutable);
        return tree.set('children', tree.getChildren().set(keyPath[0], newSubNode));
    }
}

/**
 * Generate a files tree from the current branch, taking pending changes into account.
 * @param {RepositoryState} repoState
 * @param {Path} [dir='.'] The directory to get the subtree from, default to root
 * @return {TreeNode} The directory TreeNode with all its children
 */
function get(repoState, dirPath) {
    // Remove trailing '/' etc.
    var normDirPath = Path.join(dirPath, '.');
    var filepaths = DirUtils.readFilenamesRecursive(repoState, normDirPath);

    var mutableTree = new TreeNode({
        path: normDirPath,
        directory: true,
        children: new immutable.Map().asMutable()
    });

    // Add every file to the tree
    mutableTree = _.reduce(filepaths, function insertAll(mutableTree, filePath) {
        var node = TreeNode.createFile(filePath);
        var keyPath = Path.relative(normDirPath, filePath).split('/');
        var mutable = true;
        return setInTree(mutableTree, keyPath, node, mutable);
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
 * @return {Boolean} True if the files structure changed.
 */
function hasChanged(previousRepo, newRepo, dir) {
    var previousWorking = previousRepo.getCurrentState();
    var newWorking = newRepo.getCurrentState();

    var previousFiles = WorkingUtils.getMergedFileSet(previousWorking);
    var newFiles = WorkingUtils.getMergedFileSet(newWorking);

    return !immutable.is(previousFiles, newFiles);
}

module.exports = {
    TreeNode: TreeNode,
    get: get,
    hasChanged: hasChanged
};
