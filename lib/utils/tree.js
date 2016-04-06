var immutable = require('immutable');

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
 * Generate a files tree from the current branch, taking pending changes into account.
 * @param {RepositoryState} repoState
 * @param {Path} [dir=''] The directory to get the subtree from, default to root
 * @return {Map<Path, TreeNode>} The children of the directory
 */
function get(repoState, dir) {
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
