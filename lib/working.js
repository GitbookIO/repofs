var _ = require('lodash');
var Q = require('q');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var pkg = require('../package.json');
var pathUtils = require('./utils/path');
var arrayBuffer = require('./utils/arraybuffer');
var errors = require('./errors');
var CHANGE = require('./changes');

// Key for caching data (major semver version)
var CACHE_KEY = _.first(pkg.version.split('.'));

/*
A WorkingTree represents the state of non-commited changes in the repository
*/
function WorkingTree(store, branch) {
    this.store = store;
    this.currentBranch = branch;

    _.bindAll(this);
}
util.inherits(WorkingTree, EventEmitter);

// Return name of current branch
WorkingTree.prototype.getCurrentBranch = function() {
    return this.currentBranch;
};

// Return sha of current branch
WorkingTree.prototype.head = function() {
    return this.get().sha;
};

// Update current tree with a new fetched tree
WorkingTree.prototype.fetch = function(branch, tree) {
    this.currentBranch = branch;
    this.set(tree);
};

// Return tree merged with changes
WorkingTree.prototype.getActive = function() {
    var tree = this.get();

    // Apply all changes
    _.each(tree.changes, function(change, filePath) {

        // Remove the entry for the file
        if (change.type == CHANGE.REMOVE) {
            delete tree.entries[filePath];
        }

        // Create/Update an entry
        else if (change.type == CHANGE.UPDATE || change.type == CHANGE.CREATE) {
            // Create new entry if non existant
            if (!tree.entries[filePath]) {
                tree.entries[filePath] = {
                    sha: null,
                    path: filePath,
                    size: 0
                };
            }

            tree.entries[filePath] = _.defaults(change.entry || {}, {
                path: filePath,
                size: 0
            });
        }
    });

    return tree;
};


// Push a new change to the map
// Return true, if the change is "new" (new update, new creation, new deletion, or change of type)
WorkingTree.prototype.setChange = function(filePath, type, msg, entry) {
    var that = this;
    var isNew = false;

    filePath = pathUtils.norm(filePath);

    return that.operation(msg, function() {

        // Update map of modified file in tree
        that.update(function(tree) {
            if (!tree.changes[filePath]) {
                isNew = true;
                tree.changes[filePath] = {
                    type: type
                };
            } else {
                if (type == CHANGE.UPDATE && tree.changes[filePath].type == CHANGE.REMOVE) {
                 // File has been marked as removed, but is updated; it should be created again first
                    throw errors.fileNotFound(filePath);
                } else if (type == CHANGE.UPDATE && tree.changes[filePath].type == CHANGE.CREATE) {
                    // Do nothing, type should stay CHANGE.CREATE
                    isNew = true;
                } else if (type == CHANGE.REMOVE && tree.changes[filePath].type == CHANGE.CREATE) {
                    // File not commited is removed
                    isNew = true;
                    that.revertChange(filePath);
                    return false;
                } else if (tree.changes[filePath].type != type) {
                    // Type of change changed
                    isNew = true;
                    tree.changes[filePath].type = type;
                }
            }

            if (entry) {
                if (!_.isUndefined(entry.buffer) && !_.isNull(entry.buffer)) {
                    entry.size = arrayBuffer.enforceBuffer(entry.buffer).length;
                    entry.buffer = arrayBuffer.toBase64(entry.buffer);
                    entry.sha = undefined;
                }
                entry.path = filePath;
                entry.mode = entry.mode || '100644';
                entry.type = entry.type || 'blob';
                tree.changes[filePath].entry = entry;
            }

            return tree;
        });

    })
    .then(function() {
        return isNew;
    });
};

// Move/Rename entries
WorkingTree.prototype.move = function move(from, to, msg) {
    var that = this;
    var tree = this.get();

    if (!tree.entries[from]) return Q.reject(errors.fileNotFound(from));
    if (tree.entries[to]) return Q.reject(errors.fileAlreadyExist(to));

    return that.setChange(to, CHANGE.CREATE, msg, tree.entries[from])
    .then(function() {
        return that.setChange(from, CHANGE.REMOVE, msg);
    });
};

// Revert change for a specific file
WorkingTree.prototype.revertChange = function(filePath) {
    var tree = this.get();
    filePath = pathUtils.norm(filePath);

    if (!tree.changes[filePath]) return;

    var eventType = CHANGE.REVERT[tree.changes[filePath].type];

    // Delete and update the tree
    delete tree.changes[filePath];

    if (_.size(tree.changes) == 0) {
        tree.operations = [];
        tree.lastOperation = null;
    }

    this.set(tree);

    // Emit watch event for the revert
    this.emit('revert', eventType, filePath);
};

// Revert all changes in a directory
WorkingTree.prototype.revertFolderChanges = function(dirPath) {
    var tree = this.get();

    _.each(_.keys(tree.changes), function(filePath) {
        if (!pathUtils.contains(dirPath, filePath)) return;
        this.revertChange(filePath);
    }, this);
};

// Revert all changes for a specific type (or all types)
WorkingTree.prototype.revertChanges = function(type) {
    var tree = this.get();

    _.each(_.keys(tree.changes), function(filePath) {
        if (type && tree.changes[filePath].type != type) return;
        this.revertChange(filePath);
    }, this);
};

// List pending changes
WorkingTree.prototype.listChanges = function(ref) {
    var tree = this.get(ref);
    return tree.changes || {};
};

// Return true if has uncommited changes
WorkingTree.prototype.hasUncommitedChanges = function(ref) {
    return _.size(this.listChanges(ref)) > 0;
};

// Return change for a file or undefined
WorkingTree.prototype.getChangeForFile = function(filePath) {
    var changes = this.listChanges();
    filePath = pathUtils.norm(filePath);
    return changes[filePath];
};

// Return change for a folder
WorkingTree.prototype.getChangeForFolder = function(dirPath) {
    var changes = this.listChanges();
    var change;

    _.each(changes, function(c, filename) {
        if (!pathUtils.contains(dirPath, filename)) return;

        change = {
            type: c.type
        };

        if (c.type == CHANGE.UPDATE) return false;
    });

    return change;
};

// Return true if file has been modified
WorkingTree.prototype.isFileModified = function(filePath) {
    return Boolean(this.getChangeForFile(filePath));
};

// Start/Push a new operation
WorkingTree.prototype.pushOp = function(msg) {
    this.update(function(tree) {
        tree.operations.push({
            message: msg
        });
        return tree;
    });
    this.emit('operations.started');
};

// Exit/Pull an operation
WorkingTree.prototype.completeOp = function() {
    var completed = false;

    this.update(function(tree) {
        tree.lastOperation = tree.operations.pop();
        completed = tree.operations.length == 0;
        return tree;
    });

    this.emit('operations.completed');
    if (completed) {
        this.emit('operations.allcompleted');
    }
};

// Get last operation
WorkingTree.prototype.getLastOperation = function() {
    return this.get().lastOperation;
};

// Wrap a function as an operation
WorkingTree.prototype.operation = function(msg, fn) {
    var that = this;

    this.pushOp(msg);

    return Q()
    .then(function() {
        return fn();
    })
    .fin(function() {
        that.completeOp();
    });
};

// Update tree in cache
WorkingTree.prototype.update = function(fn) {
    var tree = this.get();
    var newTree = fn(tree);
    if (newTree === false) return;

    this.set(newTree || tree);
};

// Update tree in cache
WorkingTree.prototype.set = function(tree) {
    this.setCache('tree.'+this.currentBranch, tree);
};

// Remove tree from cache
WorkingTree.prototype.destroy = function() {
    this.delCache('tree.'+this.currentBranch);
};

// Load tree in cache
WorkingTree.prototype.get = function() {
    var ref = this.currentBranch;

    var tree = this.getCache('tree.' + ref, {});
    if (!tree) return null;

    tree.changes = tree.changes || {};
    tree.operations = tree.operations || [];

    return tree;
};


// ---- Utilities to access the store ---

WorkingTree.prototype.storeKey = function(key) {
    return [CACHE_KEY, key].join('.');
};

WorkingTree.prototype.getCache = function(key, def) {
    var val = this.store.get(this.storeKey(key));
    if (_.isUndefined(val) || _.isNull(val)) return def;
    return val;
};

WorkingTree.prototype.setCache = function(key, val) {
    this.store.set(this.storeKey(key), val);
};

WorkingTree.prototype.delCache = function(key) {
    this.store.del(this.storeKey(key));
};


module.exports = WorkingTree;
