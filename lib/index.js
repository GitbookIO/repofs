var _ = require('lodash');
var Q = require('q');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var mime = require('mime-types');

var pkg = require('../package.json');

var types = require('./types');
var errors = require('./errors');

var patch = require('./utils/patch');
var gravatar = require('./utils/gravatar');
var decorators = require('./utils/decorators');
var arrayBuffer = require('./utils/arraybuffer');
var memoryStore = require('./utils/memory_store');

var GitHubDriver = require('./drivers/github');

// Normalize a path
function normPath(p) {
    p = path.normalize(p);
    if (p[0] == '/') p = p.slice(1);
    if (p[p.length - 1] == '/') p = p.slice(0, -1);
    if (p == '.') p = '';
    return p;
}

var CHANGE = {
    UPDATE: 'update',
    REMOVE: 'remove'
};


function Fs(Driver, opts) {
    if (!(this instanceof Fs)) return (new Fs(Driver, opts));
    if (_.isObject(Driver)) {
        opts = Driver;
        Driver = GitHubDriver;
    }

    this.options = _.defaults(opts || {}, {
        committer: {},
        store: memoryStore()
    });

    if (!this.options.committer
    || !this.options.committer.name
    || !this.options.committer.email) throw errors.invalidArgs('Require a valid "committer" as option');

    // Driver client
    this.driver = new Driver(this.options, this);
    this.type = Driver.id;

    // Current branch
    this.currentBranch;

    // Pending operations
    this.lastOperation;
    this.operations = [];

    // Processing commit
    this.pendingCommit = {};

    _.bindAll(this);
}

util.inherits(Fs, EventEmitter);


// Store and get data from store
Fs.prototype.get = function(key, def) {
    var val = this.options.store.get(key);
    if (_.isUndefined(key)) return def;
    return val;
};

Fs.prototype.set = function(key, val) {
    this.options.store.set(key, val);
    this.emit('set.'+key, val);
};

// Return value of current branch
Fs.prototype.getCurrentBranch = function() {
    return this.currentBranch;
};

// Bind a file object (returned from fs.stat or fs.readdir)
Fs.prototype._bindFile = function(file, opts) {
    opts = opts || {};
    var encoding = opts.encoding === undefined? 'utf8' : opts.encoding;

    file.type = file.type || 'file';
    file.isDirectory = file.type == types.DIRECTORY;
    file.path = normPath(file.path);
    file.name = path.basename(file.path);
    file.mime = file.mime || mime.lookup(path.extname(file.path)) || 'application/octet-stream';

    if (file.content) {
        if (encoding === null) file.content = arrayBuffer.enforceArrayBuffer(file.content);
        else file.content = arrayBuffer.enforceString(file.content, encoding);
    }

    return file;
};

// Bind an author
Fs.prototype._bindAuthor = function(author) {
    author.avatar = author.avatar || gravatar.url(author.email);
    return author;
};

// Bind a file patch (for commits)
Fs.prototype._bindFilePatch = function(file) {
    return {
        filename: file.filename,
        patch: file.patch? patch.parse(file.patch) : {
            text: 'binary file',
            additions: 0,
            deletions: 0,
            lines: []
        }
    };
};

// Bind a commit object (returned from fs.listCommits or fs.getCommit)
Fs.prototype._bindCommit = function(commit) {
    commit.date = new Date(commit.date);
    commit.author = this._bindAuthor(commit.author);
    if (commit.files) commit.files = _.map(commit.files, this._bindFilePatch);
    return commit;
};

// Trigger a watcher event
Fs.prototype.emitWatch = function(type, file) {
    file = normPath(file);
    var data = {
        type: type,
        path: file
    };

    this.emit('watcher', data);
    this.emit('watcher.'+type, data);
};

// Trigger a branch event
Fs.prototype.emitBranch = function(type, branch) {
    var data = {
        type: type,
        branch: branch
    };

    this.emit('branches', data);
    this.emit('branches.'+type, data);
};

// Fetch all the tree and cache it
Fs.prototype.fetchTree = decorators.uniqueOp('fetchTree', function fetchTree(opts) {
    var tree, storeKey, that = this;

    opts = _.defaults(opts || {}, {
        update: false
    });

    if (!this.currentBranch) return Q.reject(errors.invalidArgs('No branch checkout'));
    if (!opts.update) tree = this.getCacheTree();
    if (tree) return Q(tree);

    return Q()

    // Fetch tree
    .then(function() {
        return that.driver.fetchTree();
    })

    // Cache result
    .then(function(_tree) {
        that.updateCacheTree(_tree);
        return _tree;
    });
});

// Fetch tree and merge with working changes
Fs.prototype.fetchWorkingTree = function() {
    var that = this;

    return this.fetchTree()
    .then(function(tree) {
        // Apply all changes
        _.each(tree.changes, function(change, filePath) {
            if (change.type == CHANGE.REMOVE) {
                delete tree.entries[filePath];
            } else if (change.type == CHANGE.UPDATE) {
                // Create new entry if non existant
                if (!tree.entries[filePath]) {
                    tree.entries[filePath] = {
                        sha: null,
                        path: filePath,
                        size: 0
                    }
                }

                tree.entries[filePath].sha = null;
                tree.entries[filePath].buffer = change.buffer;
                tree.entries[filePath].size = change.buffer.length;
            }
        });

        return tree;
    });
};

// Return details and content of a specific file
Fs.prototype.stat = function stat(p, opts) {
    var that = this;
    opts = _.defaults({}, opts || {}, {
        encoding: 'utf8'
    });

    if (!p) return Q.reject(errors.invalidArgs('Need a file to stat'));
    p = normPath(p);

    return this.fetchWorkingTree()
    .then(function(tree) {
        var entry = _.find(tree.entries, {
            path: p
        });
        if (!entry) throw errors.fileNotFound(p);

        // Working file?
        if (!entry.sha) {
            entry.content = arrayBuffer.fromBase64(entry.buffer);
            return that._bindFile(entry, opts);
        }

        // Read blob's content
        return that.driver.fetchBlob(entry.sha)
        .then(function(blob) {
            return that._bindFile(_.extend({}, entry, {
                content: blob.content
            }), opts);
        });
    });
};

// Read content of a file
Fs.prototype.read = function read(p, opts) {
    return this.stat(p, opts).get('content');
};

// List entries in a specific directory
Fs.prototype.readdir = function readdir(p, opts) {
    var that = this, basePath;

    if (_.isPlainObject(p)) {
        opts = p;
        p = null;
    }

    opts = _.defaults({}, opts || {}, {
        encoding: 'utf8'
    });

    p = normPath(p || '');
    basePath = p? p + '/' : p;

    return this.fetchWorkingTree()
    .then(function(tree) {
        return _.chain(tree.entries)
            .map(function(entry) {
                var isChildren = entry.path.indexOf(basePath) === 0;
                if (!isChildren) return null;

                var innerPath = normPath(entry.path.replace(basePath, ''));
                var isDirectory = innerPath.indexOf('/') >= 0;
                var name = innerPath.split('/')[0];

                if (isDirectory) {
                    entry = {
                        path: normPath(path.join(basePath, name)),
                        type: types.DIRECTORY
                    };
                }

                return [
                    name,
                    that._bindFile(entry)
                ];
            })
            .compact()
            .object()
            .value();
    });
};

// Update content of an existing file
Fs.prototype.write = function write(p, content, opts) {
    var that = this;

    p = normPath(p);
    opts = _.defaults({}, opts || {}, {
        encoding: 'utf8',
        message: 'Update '+p
    });

    // Force content as arraybuffer
    content = arrayBuffer.enforceArrayBuffer(content, opts.encoding);

    return this.exists(p)
    .then(function(exists) {
        if (!exists) throw errors.fileNotFound(p);

        return that.setChange(p, CHANGE.UPDATE, opts.message, content);
    })
    .then(function() {
        that.emitWatch('change', p);

        return that.stat(p);
    });
};


// Create a new file
Fs.prototype.create = function create(p, content, opts) {
    var that = this;

    p = normPath(p);

    opts = _.defaults({}, opts || {}, {
        encoding: 'utf8',
        message: 'Create '+p
    });

    // Force content as arraybuffer
    content = arrayBuffer.enforceArrayBuffer(content, opts.encoding);

    return this.exists(p)
    .then(function(exists) {
        if (exists) throw errors.fileAlreadyExist(p);

        return that.setChange(p, CHANGE.UPDATE, opts.message, content);
    })
    .then(function() {
        that.emitWatch('add', p);

        return that.stat(p);
    });
};

// Create or write a file
Fs.prototype.update = function update(p, content, opts) {
    var that = this;

    p = normPath(p);
    return that.create(p, content, opts)
    .fail(function(err) {
        if (err.code != 409) throw err;
        return that.write(p, content, opts);
    });
};

// Return true if file doesn't exists
Fs.prototype.exists = function exists(p, opts) {
    return this.stat(p, opts)
    .then(function() {
        return true;
    }, function() {
        return Q(false);
    });
};

// Remove a file
Fs.prototype.unlink = function unlink(p, opts) {
    var that = this;

    p = normPath(p);
    opts = _.defaults({}, opts || {}, {
        message: 'Delete '+p
    });

    return this.setChange(p, CHANGE.REMOVE, opts.message)
    .then(function() {
        that.emitWatch('unlink', p);

        return undefined;
    });
};

// Move/Rename a file, equivalent:
//   create then delete
Fs.prototype.move = function move(from, to, opts) {
    var that = this;

    from = normPath(from);
    to = normPath(to);

    opts = _.defaults({}, opts || {});

    return this.operation(
        'Move file '+from+' to '+to,
        function() {
            return Q.all([
                that.read(from, _.extend(opts, {
                    encoding: null
                })),
                that.exists(to, opts)
            ])
            .spread(function(content, exists) {
                if (exists) throw errors.fileAlreadyExist(to);
                return that.create(to, content, _.extend(opts, {
                    encoding: null
                }));
            })
            .then(function(newFile) {
                return that.unlink(from, opts)
                .thenResolve(newFile);
            });
        }
    );
};
Fs.prototype.rename = Fs.prototype.move;

// Push a new change to the map
Fs.prototype.setChange = function(filePath, type, msg, buffer) {
    var that = this;
    filePath = normPath(filePath);

    return Q(this.pendingCommit)
    .then(function() {
        return that.fetchTree();
    })
    .then(function(tree) {
        return that.operation(msg, function() {
            tree.changes[filePath] = {
                type: type,
                buffer: buffer? arrayBuffer.toBase64(buffer) : ''
            };

            that.updateCacheTree(tree);
        });
    });
};

// List pending changes
Fs.prototype.listChanges = function() {
    var tree = this.getCacheTree();
    return _.clone(tree.changes);
};

// Revert change for a path
Fs.prototype.revertChange = function(filePath) {
    var that = this;
    filePath = normPath(filePath);

    return this.fetchTree()
    .then(function(tree) {
        if (!tree.changes[filePath]) return;
        delete tree.changes[filePath];

        that.updateCacheTree(tree);
    });
};

// Revert all changes
Fs.prototype.revertAllChanges = function() {
    var that = this;

    return this.fetchTree()
    .then(function(tree) {
        tree.changes = {};

        that.updateCacheTree(tree);
    });
};

// Commit all pending changes to the driver
Fs.prototype.commit = function(opts) {
    if (this.pendingCommit) return Q.reject(new Error('There is already a commit being processed'));

    var that = this;

    opts = _.defaults({}, opts || {}, {
        message: this.lastOperation? this.lastOperation.message : null
    });

    if (!opts.message) return Q.reject(errors.invalidArgs('Require a commit message'));

    this.pendingCommit = this.fetchWorkingTree()
        .then(function(tree) {
            var changes = that.listChanges(opts);
            if (_.size(changes) == 0) throw errors.invalidArgs('Nothing to commit');

            return that.driver.commitChanges(tree.sha, {
                tree: tree.entries,
                message: opts.message,
                changes: changes
            });
        })
        .fin(function() {
            that.pendingCommit = null;
        });

    return this.pendingCommit;
};

// List all branches
Fs.prototype.listBranches = function listBranches() {
    var that = this;

    return Q()
    .then(function() {
        return that.driver.listBranches();
    });
};

// Resolve and return a branch
Fs.prototype.getBranch = function getBranch(name) {
    return this.listBranches()
    .then(function(branches) {
        var branch = _.find(branches, {
            name: name
        });
        if (!branch) throw errors.refNotFound(name);

        return branch;
    });
};

// Create a new branch from an origin (default to master)
Fs.prototype.createBranch = function createBranch(name, from) {
    var that = this;
    from = from || 'master';

    return Q()
    .then(function() {
        if (!name) throw errors.invalidArgs('Require a branch name');

        return that.driver.createBranch(name, from);
    })
    .then(function(branch) {
        that.emitBranch('add', name);
        return branch;
    });
};

// Remove a branch
Fs.prototype.removeBranch = function removeBranch(name) {
    var that = this;

    return Q()
    .then(function() {
        if (!name) throw errors.invalidArgs('Require a branch name');

        return that.driver.removeBranch(name);
    })
    .then(function() {
        that.emitBranch('remove', name);
    });
};

// Merge a branches into another one
Fs.prototype.mergeBranches = function mergeBranches(from, to, opts) {
    var that = this;

    opts = _.defaults({}, opts || {}, {
        message: 'Merge '+from+' into '+to
    });

    return Q()
    .then(function() {
        if (!from) throw errors.invalidArgs('Require a branch to merge');
        if (!to) throw errors.invalidArgs('Require a branch to merge into');

        return that.driver.mergeBranches(from, to, opts);
    });
};

// List commits in a specific ref
Fs.prototype.listCommits = function(opts) {
    var that = this;
    opts = _.defaults({}, opts || {}, {
        ref: this.currentBranch || 'master',
        start: 0,
        limit: 100
    });

    return Q()
    .then(function() {
        return that.driver.listCommits(opts);
    })
    .then(function(commits) {
        return _.map(commits, that._bindCommit, that);
    });
};

// Get a specific commit
Fs.prototype.getCommit = function(sha, opts) {
    var that = this;

    opts = _.defaults({}, opts || {}, {
        parsePatches: true
    });

    return Q()
    .then(function() {
        return that.driver.getCommit(sha);
    })
    .then(that._bindCommit);
};

// Compare two refs and return list of changes
Fs.prototype.compareCommits = function(base, head, opts) {
    var that = this;

    opts = _.defaults({}, opts || {}, {

    });

    return Q()
    .then(function() {
        return that.driver.compareCommits(base, head, opts);
    })
    .then(function(r) {
        r.base = that._bindCommit(r.base);
        r.head = that._bindCommit(r.head);
        r.commits = _.map(r.commits, that._bindCommit, that);
        r.files = _.map(r.files || [], that._bindFilePatch, that);

        return r;
    });
};

// Fetch changes from remote server
Fs.prototype.fetch = function(opts) {
    var that = this;

    opts = _.defaults({}, opts || {}, {
        remote: {
            name: 'origin',
            url: null
        },
        auth: {
            username: null,
            password: null
        }
    });

    return Q()
    .then(function() {
        return that.driver.fetch(opts);
    })
    .then(function() {
        return {};
    });
};

// Push changes to remote server
Fs.prototype.push = function(opts) {
    var that = this;

    opts = _.defaults({}, opts || {}, {
        branch: 'master',
        force: false,
        remote: {
            name: 'origin',
            url: null
        },
        auth: {
            username: null,
            password: null
        }
    });

    return Q()
    .then(function() {
        return that.driver.push(opts);
    })
    .then(function() {
        return {};
    });
};

// Pull changes from remote repository
Fs.prototype.pull = function(opts) {
    var that = this;

    opts = _.defaults({}, opts || {}, {
        branch: 'master',
        force: false,
        remote: {
            name: 'origin',
            url: null
        },
        auth: {
            username: null,
            password: null
        }
    });

    return Q()
    .then(function() {
        return that.driver.pull(opts);
    })
    .then(function() {
        return {};
    });
};

// Pull then push changes
Fs.prototype.sync = function(opts) {
    var that = this;

    return this.pull(opts)
    .then(function() {
        return that.push(opts);
    });
};

// Change current branch
Fs.prototype.checkout = function(branchName, opts) {
    var that = this;

    opts = _.defaults({}, opts || {}, {
        remote: true
    });

    return Q(this.pendingCommit)
    .then(function() {
        if (_.isString(branchName)) return that.getBranch(branchName);
        return branchName;
    })
    .then(function(branch) {
        if (branch.name == that.currentBranch) return branch;

        return that.driver.checkout(branch, opts)
        .then(function() {
            that.currentBranch = branch.name;
            that.emitBranch('checkout', branch);
            return branch;
        });
    });
};

// List remotes for the repository
Fs.prototype.listRemotes = function(opts) {
    var that = this;

    return Q()
    .then(function() {
        return that.driver.listRemotes(opts);
    });
};

// Edit a remote
Fs.prototype.editRemote = function(opts) {
    var that = this;

    return Q()
    .then(function() {
        return that.driver.editRemote(opts);
    });
};

// Push a new operation
Fs.prototype.pushOp = function(msg) {
    this.operations.push({
        message: msg
    });
    this.emit('operations.started');
};

// Exit/Pull an operation
Fs.prototype.completeOp = function() {
    this.lastOperation = this.operations.pop();

    this.emit('operations.completed');
    if (this.operations.length == 0) {
        this.emit('operations.allcompleted');
    }
};

// Wrap a function as an operation
Fs.prototype.operation = function(msg, fn) {
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
Fs.prototype.updateCacheTree = function updateCacheTree(tree) {
    tree.changes = tree.changes || {};
    this.set('tree.'+this.currentBranch, tree);
};

// Load tree in cache
Fs.prototype.getCacheTree = function getCacheTree() {
    return _.cloneDeep(this.get('tree.'+this.currentBranch, {}));
};

module.exports = Fs;
module.exports.types = types;
module.exports.version = pkg.version;

