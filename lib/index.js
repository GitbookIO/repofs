var _ = require('lodash');
var Q = require('q');
var path = require('path');
var EventEmitter = require('eventemitter2').EventEmitter2;
var util = require('util');
var mime = require('mime-types');

var pkg = require('../package.json');

var types = require('./types');
var errors = require('./errors');
var conflicter = require('./conflicter');
var CHANGE = require('./changes');

var gravatar = require('./utils/gravatar');
var decorators = require('./utils/decorators');
var arrayBuffer = require('./utils/arraybuffer');
var memoryStore = require('./utils/memory_store');
var pathUtils = require('./utils/path');
var refsUtils = require('./utils/refs');
var sha = require('./utils/sha');

var GitHubDriver = require('./drivers/github');
var WorkingTree = require('./working');

var DEFAULT_BRANCH = 'master';

function Fs(Driver, opts) {
    if (!(this instanceof Fs)) return (new Fs(Driver, opts));
    EventEmitter.call(this, {
        wildcard: true
    });

    var that = this;

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

    // Create working tree
    this.working = this.getWorkingTree();
    this.working.on('revert', function(eventType, filePath) {
        that.emitWatch(eventType, filePath, true);
    });
    this.working.on('operations.*', function() {
        that.emit.apply(this, [this.event].concat(_.toArray(arguments)));
    });

    // Processing commit
    this.pendingCommit;

    _.bindAll(this);
}
util.inherits(Fs, EventEmitter);

// Return branch of current working tree
Fs.prototype.getCurrentBranch = function() {
    return this.working.getCurrentBranch();
};

// Return an instance of WorkingTree for a specific branch
Fs.prototype.getWorkingTree = function(ref) {
    return (new WorkingTree(this.options.store, ref));
};

// Return true if there are non-committed changes on a branch
Fs.prototype.hasUncommitedChanges = function(branch) {
    var working = branch? this.getWorkingTree(branch) : this.working;
    return working.hasUncommitedChanges();
};

// Fetch all the tree and cache it
Fs.prototype.doFetchTree = decorators.uniqueOp('fetchTree', function fetchTree(opts) {
    var tree, that = this;

    opts = _.defaults(opts || {}, {
        branch: this.getCurrentBranch(),
        update: false,
        updateIfClean: false
    });

    if (!opts.branch) return Q.reject(errors.invalidArgs('No branch checkout'));

    // Change current branch of working tree
    this.working.setCurrentBranch(opts.branch);

    // Load tree from cache
    var cachedTree = this.working.getTree();

    // If no update required, take tree from cache
    if (!opts.update) {
        tree = cachedTree;
    }

    // If has entries and clean
    if (tree && _.size(tree.entries) > 0 && (!opts.updateIfClean || _.size(tree.changes) > 0)) {
        return Q();
    }

    return Q()

    // Fetch tree
    .then(function() {
        return that.driver.fetchTree(opts.branch);
    })

    // Update working tree
    .then(function(newTree) {
        that.working.fetch(opts.branch, newTree);

        // Emit fetch, and signal tree changed if head has changed
        that.emitWatch('fetch', '', (!cachedTree || cachedTree.sha != newTree.sha));
    });
});

// Return current tree
Fs.prototype.fetchTree = function(opts) {
    var that = this;

    return this.doFetchTree(opts)
    .then(function() {
        return that.working.getTree();
    });
};

// Fetch tree and merge with working changes
Fs.prototype.fetchWorkingTree = function() {
    var that = this;

    return this.fetchTree()
    .then(function() {
        return that.working.getActive();
    });
};

// Returns the sha of a ref, unless it is already a sha
Fs.prototype._getSha = function (ref) {
    if (sha.validateSha(ref)) {
        return Q(ref);
    } else {
        return this.driver.getRef(ref)
        .then(function(r) {
            return r.object.sha;
        });
    }
};

// Return details and content of a specific file
Fs.prototype.stat = function(p, opts) {
    var that = this;
    opts = _.defaults({}, opts || {}, {
        encoding: 'utf8'
    });

    if (!p) return Q.reject(errors.invalidArgs('Need a file to stat'));
    p = pathUtils.norm(p);

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
Fs.prototype.read = function(p, opts) {
    return this.stat(p, opts).get('content');
};


// Read content of a blob
Fs.prototype.readBlob = function(sha, opts) {
    opts = _.defaults(opts || {}, {
        encoding: null
    });

    return this.driver.fetchBlob(sha)
    .then(function(blob) {
        if (!opts.encoding) return blob.content;
        else return arrayBuffer.enforceString(blob.content, opts.encoding);
    });
};

// Filter entries by parent folder
Fs.prototype.filterTree = function(tree, p) {
    var that = this;

    p = pathUtils.norm(p || '');
    var basePath = p? p + '/' : p;

    return _.chain(tree.entries)
        .map(function(entry) {
            var isChildren = pathUtils.contains(p, entry.path);
            if (!isChildren) return null;

            var innerPath = pathUtils.norm(entry.path.replace(basePath, ''));
            var isDirectory = innerPath.indexOf('/') >= 0;
            var name = innerPath.split('/')[0];

            if (isDirectory) {
                entry = {
                    path: pathUtils.norm(path.join(basePath, name)),
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
};

// Output a normalized tree
Fs.prototype.readTree = function(root) {
    var that = this;

    return this.fetchWorkingTree()
    .then(function(tree) {
        var filesTree = {};
        var folders = [];

        _.each(tree.entries, function(treeEntry) {
            var entry = that._bindFile(treeEntry);
            var keys = pathUtils.keys(entry.path, false);
            var pathParts = entry.path.split('/').slice(0, -1);

            // Create folder
            _.each(pathParts, function(k, i) {
                var dirPath = pathParts.slice(0, i + 1).join('/');
                var dirKeys = pathUtils.keys(dirPath, false);

                if (!dirPath || _.contains(folders, dirPath)) return;

                _.set(filesTree, dirKeys,  that._bindFile({
                    path: dirPath,
                    type: types.DIRECTORY,
                    children: {}
                }));

                folders.push(dirPath);
            });

            _.set(filesTree, keys, entry);
        });

        return filesTree;
    });
};

// List entries in a specific directory
Fs.prototype.readdir = function(p) {
    var that = this;

    return this.fetchWorkingTree()
    .then(function(tree) {
        return that.filterTree(tree, p);
    });
};

// Update content of an existing file
Fs.prototype.write = function(p, content, opts) {
    var that = this;

    p = pathUtils.norm(p);
    opts = _.defaults({}, opts || {}, {
        encoding: 'utf8',
        message: 'Update '+p
    });

    // Force content as arraybuffer
    content = arrayBuffer.enforceArrayBuffer(content, opts.encoding);

    return this.exists(p)
    .then(function(exists) {
        if (!exists) throw errors.fileNotFound(p);

        return that.setChange(p, CHANGE.UPDATE, opts.message, { buffer: content });
    })
    .then(function(isNew) {
        that.emitWatch(CHANGE.UPDATE, p, isNew);
    })

    // When auto-commiting, it's better to wait it for the commit to be processed
    // So we wait for the next event loop
    .delay(1)
    .then(function() {
        return that.waitTillCommitted();
    })

    // Stat new file
    .then(function() {
        return that.stat(p);
    });
};


// Create a new file
Fs.prototype.create = function(p, content, opts) {
    var that = this;

    p = pathUtils.norm(p);

    opts = _.defaults({}, opts || {}, {
        encoding: 'utf8',
        message: 'Create '+p
    });

    // Force content as arraybuffer
    content = arrayBuffer.enforceArrayBuffer(content, opts.encoding);

    return this.exists(p)
    .then(function(exists) {
        if (exists) throw errors.fileAlreadyExist(p);

        return that.setChange(p, CHANGE.CREATE, opts.message, { buffer: content });
    })
    .then(function(isNew) {
        that.emitWatch(CHANGE.UPDATE, p, isNew);

        return that.stat(p);
    });
};

// Create or write a file
Fs.prototype.update = function(p, content, opts) {
    var that = this;

    p = pathUtils.norm(p);
    return that.create(p, content, opts)
    .fail(function(err) {
        if (err.code != errors.CODE.ALREADY_EXIST) throw err;
        return that.write(p, content, opts);
    });
};

// Return true if file/folder exists
Fs.prototype.exists = function(p) {
    p = pathUtils.norm(p);

    return this.fetchWorkingTree()
    .then(function(tree) {
        // Does file exists?
        if (tree.entries[p]) return true;

        // Look for a folder
        return _.any(tree.entries, function(entry, entryPath) {
            return pathUtils.contains(p, entryPath);
        });
    });
};

// Remove a file
Fs.prototype.unlink = function(p, opts) {
    var that = this;

    p = pathUtils.norm(p);
    opts = _.defaults({}, opts || {}, {
        message: 'Delete '+p
    });

    return this.setChange(p, CHANGE.REMOVE, opts.message)
    .then(function(isNew) {
        that.emitWatch(CHANGE.REMOVE, p, isNew);

        return undefined;
    });
};

// Remove a folder
Fs.prototype.rmdir = function(p, opts) {
    var that = this;

    p = pathUtils.norm(p);
    opts = _.defaults({}, opts || {}, {
        message: 'Delete folder '+p
    });

    return this.operation(
        opts.message,
        function() {
            return that.fetchWorkingTree()
            .then(function(tree) {
                return _.reduce(tree.entries, function(prev, entry, filePath) {
                    // Is inside the folder
                    if (filePath.indexOf(p + '/') !== 0) return prev;

                    return prev.then(function() {
                        return that.setChange(filePath, CHANGE.REMOVE, opts.message);
                    });
                }, Q());
            })
            .then(function() {
                that.emitWatch(CHANGE.REMOVE, p, true);

                return undefined;
            });
        }
    );
};

Fs.prototype.move = function(from, to, opts) {
    var that = this;

    from = pathUtils.norm(from);
    to = pathUtils.norm(to);

    opts = _.defaults({}, opts || {}, {
        message: 'Move file '+from+' to '+to
    });

    if (from == to) {
        return Q.reject(errors.invalidArgs('Can\'t move file to the same location'));
    }

    return this.operation(
        opts.message,
        function() {
            return that.fetchWorkingTree()
            .then(function() {
                return that.working.move(from, to, opts.message);
            })
            .then(function() {
                that.emitWatch(CHANGE.CREATE, to, true);
                that.emitWatch(CHANGE.REMOVE, from, true);

                return undefined;
            });
        }
    );
};
Fs.prototype.rename = Fs.prototype.move;

Fs.prototype.mvdir = function(from, to, opts) {
    var that = this;

    from = pathUtils.norm(from);
    to = pathUtils.norm(to);

    opts = _.defaults({}, opts || {}, {
        message: 'Move directory '+from+' to '+to
    });

    if (from == to) {
        return Q.reject(errors.invalidArgs('Can\'t move folder to the same location'));
    }

    return this.exists(to)
    .then(function(exists) {
        if (exists) throw errors.dirAlreadyExist(to);

        return that.operation(
            opts.message,
            function() {
                return that.fetchWorkingTree()
                .then(function(tree) {
                    // Move all entries
                    return _.reduce(tree.entries, function(prev, entry, entryPath) {
                        // Only process file in the directory
                        if (!pathUtils.contains(from, entryPath)) return prev;

                        return prev.then(function() {
                            var innerFilename = path.relative(from, entryPath);
                            var newEntry = path.join(to, innerFilename);

                            return that.working.move(tree, entryPath, newEntry, opts.message);
                        });
                    }, Q());
                })
                .then(function() {
                    that.emitWatch(CHANGE.CREATE, to, true);
                    that.emitWatch(CHANGE.REMOVE, from, true);

                    return undefined;
                });
            }
        );
    });
};

// Push a new change to the map
// Return true, if the change is "new" (new update, new creation, new deletion, or change of type)
Fs.prototype.setChange = function(filePath, type, msg, entry) {
    var that = this;

    return this.waitTillCommitted()
    .then(function() {
        return that.fetchTree();
    })
    .then(function() {
        return that.working.setChange(filePath, type, msg, entry);
    });
};

// Return true if commiting
Fs.prototype.isCommitting = function() {
    return Boolean(this.pendingCommit);
};

// Wait till current commit is done
Fs.prototype.waitTillCommitted = function() {
    if (!this.isCommitting()) return Q();
    return this.pendingCommit
    .fail(function() {
        return Q();
    });
};

// Get last/current commit message
Fs.prototype.getCommitMessage = function() {
    var lastOp = this.working.getLastOperation();
    return lastOp? lastOp.message : '';
};

// Commit all pending changes to the driver
Fs.prototype.commit = function(opts) {
    if (this.isCommitting()) {
        return Q.reject(new Error('There is already a commit being processed'));
    }

    var that = this;

    // As returned by the driver after creation
    var newCommit;

    // Branch on which we are committing
    var branch = this.getCurrentBranch();
    var refLocal = refsUtils.local(branch);

    opts = _.defaults({}, opts || {}, {
        message: this.getCommitMessage()
    });

    if (!opts.message) {
        return Q.reject(errors.invalidArgs('Require a commit message'));
    }

    this.pendingCommit = this.fetchWorkingTree()

        // Commit using driver
        .then(function(tree) {
            if (!that.hasUncommitedChanges()) {
                throw errors.invalidArgs('Nothing to commit');
            }

            return that.driver.commit({
                message: opts.message,
                parents: [tree.sha],
                tree: tree.entries
            });
        })

        // Update ref
        .then(function (commit) {
            newCommit = commit;
            return that.driver.updateRef(refLocal, commit.sha);
        })

        // Handle cannot fast forward and conflicts
        .fail(function(err) {
            if (!newCommit) throw err;
            return that.handleCannotFastForward(refLocal, newCommit.sha, err);
        })

        // Fetch new tree
        .then(function() {
            return that.fetchTree({
                update: true
            });
        })

        // Operation is done
        .fin(function() {
            that.emit('commit', {
                commit: {
                    message: opts.message
                }
            });
            that.pendingCommit = null;
        });

    return this.pendingCommit;
};

// List all branches
Fs.prototype.listBranches = function() {
    var that = this;

    return Q()
    .then(function() {
        return that.driver.listBranches();
    })
    .then(function(branches) {
        return _.map(branches, function(branch) {
            branch.hasUncommitedChanges = that.hasUncommitedChanges(branch.name);
            return branch;
        });
    });
};

// Resolve and return a branch
Fs.prototype.getBranch = function(name) {
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
// String, String -> Promise()
Fs.prototype.createBranch = function(name, from) {
    var that = this;
    from = from || DEFAULT_BRANCH;

    return Q()
    .then(function() {
        if (!name) throw errors.invalidArgs('Require a branch name');
        if (that.hasUncommitedChanges(name)) {
            throw errors.invalidArgs('There are uncommitted changes in the base branch, revert these changes before creating a new branch');
        }

        return that.driver.createBranch(name, from);
    })
    .then(function(branch) {
        that.emitBranch('add', name);
        return branch;
    });
};

// Remove a branch
Fs.prototype.removeBranch = function(name) {
    var that = this;

    return Q()
    .then(function() {
        if (!name) throw errors.invalidArgs('Require a branch name');
        if (name == that.getCurrentBranch()) throw errors.invalidArgs('Can\'t remove current branch');
        if (that.hasUncommitedChanges(name)) {
            throw errors.invalidArgs('There are uncommitted changes, revert these changes before removing the branch');
        }

        return that.driver.removeBranch(name);
    })
    .then(function() {
        that.emitBranch('remove', name);
    })

    // Remove branch state
    .then(function() {
        that.getWorkingTree(name).destroy();
    });
};

// Merge a branch into another one. Only works with local branches
Fs.prototype.mergeBranches = function(from, to, opts) {
    var that = this;

    opts = _.defaults({}, opts || {}, {
        message: 'Merge '+from+' into '+to
    });

    return Q()

    // Valid arguments and merge branches
    .then(function() {
        if (!from) throw errors.invalidArgs('Require a branch to merge');
        if (!to) throw errors.invalidArgs('Require a branch to merge into');

        if (that.hasUncommitedChanges(from)) {
            throw errors.invalidArgs('Can\'t merge this branch "' + from + '", there are uncommitted changes.');
        }
        if (that.hasUncommitedChanges(to)) {
            throw errors.invalidArgs('Can\'t merge in this branch "' + to + '", there are uncommitted changes.');
        }

        return that.driver.mergeBranches(from, to, opts);
    })

    // Handle conflicts
    .fail(function (err) {
        if (err.code === errors.CODE.CONFLICT) {
            return that.resolveConflicts(refsUtils.local(to), refsUtils.local(from));
        } else {
            throw err;
        }
    })

    // Remove branch state
    .then(function() {
        that.getWorkingTree(from).destroy();
        that.getWorkingTree(to).destroy();
    });
};

// Emit a 'conflicts.resolve.needed' event to defer conflicts
// resolving. The `conflicts` and a function `next()` taking as
// argument the resolved conflict object :
// {
//     message: 'Commit message'
//     files: {
//         <path>: {
//             path: <path>,
//             buffer: 'Merged content'
//         },
//         ...
//     }
// }
Fs.prototype._signalConflicts = function(conflicts) {
    var d = Q.defer();

    var next = function(err, solved) {
        if (err) {
            d.reject(err);
        } else {
            d.resolve(solved);
        }
    };

    // A single listener is must be responsible to solve the conflicts
    if (_.size(this.listeners('conflicts.resolve.needed')) != 1) {
        next(new Error('Couldn\'t resolve conflicts'));
    } else {
        this.emit('conflicts.resolve.needed', conflicts, next);
    }

    return d.promise;
};

// Attempts to merge the conflicts between base and head
// String, String -> Promise()
Fs.prototype.resolveConflicts = function(base, head) {
    var that = this;
    return this._detectConflicts(base, head)
    .then(function (conflicts) {
        return Q.all([
            that._signalConflicts(
                _.pick(conflicts, 'base', 'head', 'status', 'conflicts')
            ),
            that._getSha(base),
            that._getSha(head)
        ])

        // Commit resoved tree as a merge commit (two parents)
        .spread(function (resolved, shaBase, shaHead) {
            return that.driver.commit({
                message: resolved.message || 'Conflict resolution',
                parents: [shaBase, shaHead],
                tree: conflicter.mergeInTree(resolved, conflicts.baseTree).entries
            });
        });
    })

    // Update ref with new commit
    .then(function (commit) {
        return that.driver.updateRef(base, commit.sha);
    })

    // Signal conflicts have been solved
    .then(function() {
        that.emit('conflicts.resolve.success');
    }, function(err) {
        that.emit('conflicts.resolve.failed', err);
        throw err;
    });
    // TODO handle further conflicts ?
};


// Detects NOT FAST FORWARD errors and attempts an automatic merge,
// and if needed a conflict resolution on the given base and
// head. Passes on any other unrecognized error.
// String, String, Error -> Promise()
Fs.prototype.handleCannotFastForward = function (base, head, err) {
    var that = this;
    if (err.code === errors.CODE.NOT_FAST_FORWARD) {
        // Merge head into remote
        return this.driver.mergeBranches(head, base)
        // When conflicts need to be resolved
        .fail(function detectConflicts (err) {
            if (err.code === errors.CODE.CONFLICT) {
                return that.resolveConflicts(base, head);
            } else {
                throw err;
            }
        });
    } else {
        return Q.reject(err);
    }
};


// List commits in a specific ref
Fs.prototype.listCommits = function(opts) {
    var that = this;
    opts = _.defaults({}, opts || {}, {
        ref: this.getCurrentBranch() || DEFAULT_BRANCH,
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

// Detects the type of conflicts between two refs, and list them.
Fs.prototype._detectConflicts = function(base, head) {
    return Q.all([
        this.driver.fetchTree(base),
        this.driver.fetchTree(head)
    ])
    .spread(function(baseTree, headTree) {
        return Q(conflicter.listConflicts(baseTree.entries, headTree.entries))
        .then(function(conflictList) {
            var isConflict = _.find(conflictList, function(entry) {
                return entry.status !== conflicter.FILE.UNCHANGED;
            });
            var status = isConflict ? conflicter.REFS.DIVERGED : conflicter.REFS.IDENTICAL ;
            return {
                base: base,
                head: head,
                status: status,
                conflicts: conflictList,
                baseTree: baseTree,
                headTree: headTree
            };
        });
    });
};

// Extract collaboration infos about a file
Fs.prototype.getCollaborationStats = function(filename, opts) {
    return this.listCommits(_.extend({
        path: filename,
        limit: 10
    }, opts || {}))
    .then(function(commits) {
        var lastCommit = _.first(commits);
        var contributors = _.chain(commits)
            .map(function(commit) {
                return commit.author;
            })
            .uniq('email')
            .value();

        return {
            lastCommit: lastCommit,
            contributors: contributors
        };
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
        branch: this.getCurrentBranch(),
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

    var refRemote = refsUtils.remote(opts.remote.name, opts.branch);
    var refLocal = refsUtils.local(opts.branch);

    return Q()
    .then(function() {
        return that.driver.push(opts);
    })
    .thenResolve({})
    .fail(function (err) {
        return that.handleCannotFastForward(refRemote, refLocal, err)
        .then(function repush() {
            // With same options
            return that.push(opts);
        });
    });
};

// Pull changes from remote repository
Fs.prototype.pull = function(opts) {
    var that = this;

    opts = _.defaults({}, opts || {}, {
        branch: this.getCurrentBranch(),
        handleConflicts: true,
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

    var refRemote = refsUtils.remote(opts.remote.name, opts.branch);
    var refLocal = refsUtils.local(opts.branch);

    return Q()
    .then(function() {
        if (that.hasUncommitedChanges(opts.branch)) {
            throw errors.invalidArgs('There are uncommitted changes. Commit these changes before synchronization.');
        }

        return that.driver.pull(opts);
    })
    // Handle cannot fast forward and merge conflicts
    .fail(function(err) {
        if (!opts.handleConflicts) throw err;
        return that.handleCannotFastForward(refLocal, refRemote, err);
    })

    .then(function() {
        return that.fetchTree({
            update: true
        });
    })
    .thenResolve({});
};

// Pull then push changes
Fs.prototype.sync = function(opts) {
    var that = this;

    return Q()
    .then(function() {
        return that.pull(opts);
    })
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

    return this.waitTillCommitted()
    .then(function() {
        if (_.isString(branchName)) return that.getBranch(branchName);
        return branchName;
    })

    // Do checkout this branch
    .then(function(branch) {
        if (!branch) throw errors.invalidArgs('Branch "'+branchName+'" doesn\'t exists');
        if (branch.name == that.getCurrentBranch()) return branch;

        return that.driver.checkout(branch, opts)
        .then(function() {
            // Fetch/Update tree if possible
            return that.doFetchTree({
                branch: branch.name,
                updateIfClean: true
            })
            .thenResolve(branch);
        })

        .then(function(branch) {
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

// ---- Utilities to bind results ----

// Bind a file object (returned from fs.stat or fs.readdir)
Fs.prototype._bindFile = function(file, opts) {
    opts = opts || {};
    var encoding = opts.encoding === undefined? 'utf8' : opts.encoding;

    // Return a unique buffer ID for the file
    // The ID depends on the the branch and the current revision
    file.id = [file.path, this.working.head(), file.sha || 'working'].join('-');

    file.ref = this.getCurrentBranch();
    file.type = file.type == 'blob'? 'file' : (file.type || 'file');
    file.isDirectory = file.type == types.DIRECTORY;
    file.path = pathUtils.norm(file.path);
    file.name = path.basename(file.path);
    file.mime = file.mime || mime.lookup(path.extname(file.path)) || 'application/octet-stream';
    file.change = file.isDirectory?
        this.working.getChangeForFolder(file.path) :
        this.working.getChangeForFile(file.path);

    if (file.content) {
        if (encoding === null) file.content = arrayBuffer.enforceArrayBuffer(file.content);
        else file.content = arrayBuffer.enforceString(file.content, encoding);
    }

    return file;
};

// Parse and normalize patches. Not done for now.
Fs.prototype._bindFilePatch = function(filePatch) {
    return filePatch;
};

// Bind an author
Fs.prototype._bindAuthor = function(author) {
    author.avatar = author.avatar || gravatar.url(author.email);
    return author;
};

// Bind a commit object (returned from fs.listCommits or fs.getCommit)
Fs.prototype._bindCommit = function(commit) {
    commit.date = new Date(commit.date);
    commit.author = this._bindAuthor(commit.author);
    return commit;
};

// ------ Interface for working tree

Fs.prototype.revertChanges = bindWorkingTree('revertChanges');
Fs.prototype.revertChange = bindWorkingTree('revertChange');
Fs.prototype.revertFolderChanges = bindWorkingTree('revertFolderChanges');
Fs.prototype.listChanges = bindWorkingTree('listChanges');
Fs.prototype.operation = bindWorkingTree('operation');

// ------ Utilities for events

// Trigger a watcher event
Fs.prototype.emitWatch = function(type, file, filesTreeChanged) {
    file = pathUtils.norm(file);
    var data = {
        type: type,
        path: file,
        filesTreeChanged: filesTreeChanged
    };

    this.emit('watcher.'+type, data);
};

// Trigger a branch event
Fs.prototype.emitBranch = function(type, branch) {
    var data = {
        type: type,
        branch: branch
    };

    this.emit('branches.'+type, data);
};

// Bind a method from working tree
function bindWorkingTree(method) {
    return function() {
        return this.working[method].apply(this.working, arguments);
    };
}

module.exports = Fs;
module.exports.types = types;
module.exports.version = pkg.version;
