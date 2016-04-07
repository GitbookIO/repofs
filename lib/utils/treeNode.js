var _ = require('lodash');
var immutable = require('immutable');

/**
 * Simple immutable tree structure. Uses Seq of keys for ease of use.
 * TreeNode<K, V> with K as key type and V as value type.
 */
var TreeNode = immutable.Record({
    // V
    value: null,
    // Map<K, TreeNode>
    children: new immutable.Map()
});

function getter(property) {
    return function () {
        return this.get(property);
    };
}
TreeNode.prototype.getChildren = getter('children');
TreeNode.prototype.getValue = getter('value');

TreeNode.prototype.hasChildren = function () {
    return !this.getChildren().isEmpty();
};

function partialThis(fun) {
    return function () {
        var args = Array.prototype.slice.call(arguments);
        return fun.apply(null, [this].concat(args));
    };
}
// Functions applied to this
TreeNode.prototype.setIn = partialThis(setIn);
TreeNode.prototype.getIn = partialThis(getIn);
TreeNode.prototype.asImmutable = partialThis(asImmutable);
TreeNode.prototype.asMutable = partialThis(asMutable);

// ---- Static ---- //

/**
 * Creates a TreeNode with no children
 * @param {V} value
 * @return {TreeNode<?, V>}
 */
TreeNode.createLeaf = function (value) {
    return new TreeNode({
        value: value
    });
};

/**
 * Creates a directory TreeNode with given path
 * @param {V} value
 * @param {Map<K, TreeNode>} children
 * @return {TreeNode<K, V>}
 */
TreeNode.create = function (value, children) {
    return new TreeNode({
        value: value,
        children: children
    });
};

/**
 * Get the TreeNode at the given relative key Seq
 * @param {TreeNode<K, V>} tree
 * @param {Seq<K>} keySeq
 * @return {TreeNode | Null} null if not found
 */
TreeNode.getIn = getIn;
function getIn(tree, keySeq) {
    if (keySeq.count() === 0) {
        return tree;
    } else {
        var children = tree.getChildren();
        var key = keySeq.first();
        if (children.has(key)) {
            return children.get(key).getIn(keySeq.rest());
        } else {
            return null;
        }
    }
}

/**
 * Insert a TreeNode into another tree, creating intermediate nodes as
 * necessary.
 * @param {TreeNode<K, V>} tree
 * @param {Seq<K>} keySeq The key sequence at which the node should
 * be. An empty Seq will return tree node
 * @param {TreeNode<K, V>} node
 * @param {Boolean} [options.mutable=false] To use mutable instance of
 * Map in created nodes.
 * @param {Function} [options.createValue=constant(null)] Callback to
 * generate intermediate nodes' values, taking as argument the parent
 * tree of the node being created, and the Seq of keys leading to the node
 * @return {TreeNode<K, V>}
 */
TreeNode.setIn = setIn;
function setIn(tree, keySeq, node, options) {
    options = _.defaults({}, options || {}, {
        mutable: false,
        createValue: _.constant(null)
    });
    var initialKeySeq = keySeq;

    return (function auxSetIn(tree, keySeq) {
        if(keySeq.count() === 0) {
            // Insert here
            return node;
        } else {
            // Insert in tree
            var key = keySeq.first();
            var exists = tree.getChildren().has(key);

            // Find the node to insert into
            var subNode;
            if (!exists) {
                // Create children for subdirectory
                var children = new immutable.Map();
                // Create a directory node
                var value = options.createValue(
                    // parent tree
                    tree,
                    // Key seq of the created node (include current key)
                    initialKeySeq.take(initialKeySeq.count() - keySeq.count() + 1)
                );
                subNode = TreeNode.create(value, children);
                if (options.mutable) subNode = subNode.asMutable();
            } else {
                // Update directory node
                subNode = tree.getChildren().get(key);
            }

            var newSubNode = auxSetIn(subNode, keySeq.rest());
            return tree.set('children', tree.getChildren().set(key, newSubNode));
        }
    })(tree, keySeq);
}

TreeNode.asImmutable = asImmutable;
function asImmutable(tree) {
    var children = tree.getChildren().map(asImmutable).asImmutable();
    return tree.set('children', children);
}

// TODO Record can also be made mutable/immutable.
TreeNode.asMutable = asMutable;
function asMutable(tree) {
    var children = tree.getChildren().map(asMutable).asMutable();
    return tree.set('children', children);
}

module.exports = TreeNode;
