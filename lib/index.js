var _ = require('lodash');
var Q = require('q');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var crypto = require('crypto');
var mime = require('mime-types');

var types = require('./types');
var errors = require('./errors');
var patch = require('./utils/patch');
var arrayBuffer = require('./utils/arraybuffer');

// Bind and ensure validity of argument for method on ref
function refMethod(fn) {
    return function() {
        var args = _.toArray(arguments);
        if (!_.isPlainObject(_.last(args))) {
            args.push({});
        }

        var opts = args[args.length - 1];

        opts = _.defaults(opts, {
            ref: "master"
        });

        if (!opts.ref) return Q.reject(errors.invalidArgs('Need valid "ref" options'));
        return fn.apply(this, args);
    }
}

// Normalize a path
function normPath(p) {
    p = path.normalize(p);
    if (p[0] == '/') p = p.slice(1);
    if (p[p.length - 1] == '/') p = p.slice(0, -1);
    if (p == '.') p = "";
    return p;
}

// Get gravatar url
function gravatarUrl(email) {
    var shasum = crypto.createHash('md5');
    shasum.update(email);
    return "http://www.gravatar.com/avatar/"+shasum.digest('hex')+"?s=200&d=identicon";
}


function Fs(Driver, opts) {
    if (!(this instanceof Fs)) return (new Fs(Driver, opts));

    this.options = _.defaults(opts || {}, {
        commiter: {}
    });

    if (!this.options.commiter
    || !this.options.commiter.name
    || !this.options.commiter.email) throw "Need a valid 'commiter' as option";

    // Driver client
    this.driver = new Driver(this.options, this);
    this.type = Driver.id;

    // Cache of path => sha
    this.shas = {};

    _.bindAll(this);
}

util.inherits(Fs, EventEmitter);

// Bind a file object (returned from fs.stat or fs.readdir)
Fs.prototype._bindFile = function(file, encoding) {
    encoding = encoding === undefined? 'utf8' : encoding;

    this.shas[file.path] = file.sha;
    file.isDirectory = file.type == types.DIRECTORY;
    file.path = normPath(file.path);
    file.mime = file.mime || mime.lookup(path.extname(file.path)) || 'application/octet-stream';

    if (file.content) {
        if (encoding === null) file.content = arrayBuffer.enforceArrayBuffer(file.content);
        else file.content = arrayBuffer.enforceString(file.content, encoding);
    }

    return file;
};

// Bind an author
Fs.prototype._bindAuthor = function(author) {
    author.avatar = author.avatar || gravatarUrl(author.email);
    return author;
};

// Bind a commit object (returned from fs.listCommits or fs.getCommit)
Fs.prototype._bindCommit = function(commit) {
    commit.date = new Date(commit.date);
    commit.author = this._bindAuthor(commit.author);
    return commit;
};

// Trigger a watcher event
Fs.prototype.emitWatch = function(type, file) {
    file = normPath(file);
    var data = {
        type: type,
        path: file
    };

    this.emit('watch', data);
    this.emit('watch.'+type, data);
};

Fs.prototype.stat = refMethod(function stat(p, opts) {
    var that = this;
    opts = _.defaults(opts, {
        encoding: 'utf8'
    });

    p = normPath(p);

    return Q()
    .then(function() {
        return that.driver.stat(p, opts);
    })
    .then(function(file) {
        return that._bindFile(file, opts.encoding);
    });
});

Fs.prototype.readdir = refMethod(function readdir(p, opts) {
    var that = this;

    if (_.isPlainObject(p)) {
        opts = p;
        p = null;
    }

    p = normPath(p || '');
    opts = _.defaults(opts, {
        encoding: 'utf8'
    });

    return Q()
    .then(function() {
        return that.driver.readdir(p, opts);
    })
    .then(function(files) {
        return _.mapValues(files, function(file) {
            return that._bindFile(file, opts.encoding);
        }, that);
    });
});

Fs.prototype.read = refMethod(function read(p, opts) {
    return this.stat(p, opts).get('content');
});

Fs.prototype.write = refMethod(function write(p, content, opts) {
    var that = this;

    p = normPath(p);
    opts = _.defaults(opts || {}, {
        encoding: 'utf8',
        message: "Update "+p,
        preventOverride: true
    });

    // Force content as arraybuffer
    content = arrayBuffer.enforceArrayBuffer(content, opts.encoding);

    return Q()

    // Prevent ovveride
    .then(function() {
        if (!opts.preventOverride) return;

        // Get sha of file on disk
        return Q(that.driver.stat(p, { ref: opts.ref }))
        .then(function(infos) {
            // Check if different from cache
            if (opts.preventOverride && that.shas[infos.path] && that.shas[infos.path] != infos.sha) {
                throw errors.fileHasBeenModified(infos.path);
            }
        })
    })

    // Write using driver
    .then(function() {
        return that.driver.write(p, content, opts);
    })

    // Return normalized file
    .then(function(file) {
        that.emitWatch('change', p);

        if (!file) return that.stat(p, { ref: opts.ref });
        return  that._bindFile(file, opts.encoding);
    });
});

Fs.prototype.create = refMethod(function create(p, content, opts) {
    var that = this;

    p = normPath(p);
    opts = _.defaults(opts || {}, {
        encoding: 'utf8',
        message: "Create "+p
    });

    // Force content as arraybuffer
    content = arrayBuffer.enforceArrayBuffer(content, opts.encoding);

    return Q()

    // Create file
    .then(function() {
        return that.driver.create(p, content, opts);
    })

    // Return normalized file
    .then(function(file) {
        that.emitWatch('add', p);

        if (!file) return that.stat(p, { ref: opts.ref });
        return  that._bindFile(file, opts.encoding);
    });
});

Fs.prototype.update = refMethod(function update(p, content, opts) {
    var that = this;

    p = normPath(p);
    return that.create(p, content, opts)
    .fail(function(err) {
        if (err.code != 409) throw err;
        return that.write(p, content, opts);
    });
});

Fs.prototype.exists = refMethod(function exists(p, opts) {
    return this.stat(p, opts)
    .then(function() {
        return true;
    }, function() {
        return Q(false);
    });
});

Fs.prototype.unlink = refMethod(function unlink(p, opts) {
    var that = this;

    p = normPath(p);
    opts = _.defaults(opts || {}, {
        message: "Delete "+p
    });

    return Q()
    .then(function() {
        return that.driver.unlink(p, opts);
    })
    .then(function() {
        that.emitWatch('unlink', p);

        return undefined;
    });
});

Fs.prototype.move = refMethod(function move(from, to, opts) {
    var that = this;

    from = normPath(from);
    to = normPath(to);

    return Q.all([
        that.read(from, opts),
        that.exists(to, opts)
    ])
    .spread(function(content, exists) {
        if (exists) throw errors.fileAlreadyExist(to);
        return that.create(to, content, opts);
    })
    .then(function(newFile) {
        return that.unlink(from)
        .thenResolve(newFile);
    });
});
Fs.prototype.rename = Fs.prototype.move;

Fs.prototype.listBranches = function listBranches() {
    var that = this;

    return Q()
    .then(function() {
        return that.driver.listBranches();
    });
};

Fs.prototype.createBranch = function createBranch(name, from) {
    var that = this;
    from = from || "master";

    return Q()
    .then(function() {
        if (!name) throw "Need a branch name";

        return that.driver.createBranch(name, from);
    });
};

Fs.prototype.removeBranch = function removeBranch(name) {
    var that = this;

    return Q()
    .then(function() {
        if (!name) throw "Need a branch name";

        return that.driver.removeBranch(name);
    });
};

Fs.prototype.mergeBranches = function mergeBranches(from, to, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        message: "Merge "+from+" into "+to
    });

    return Q()
    .then(function() {
        if (!from) throw "Need a branch to merge";
        if (!to) throw "Need a branch to merge into";

        return that.driver.mergeBranches(from, to, opts);
    });
};

Fs.prototype.listCommits = refMethod(function(opts) {
    var that = this;
    opts = _.defaults(opts || {}, {
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
});

Fs.prototype.getCommit = function(sha, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        parsePatches: true
    });

    return Q()
    .then(function() {
        return that.driver.getCommit(sha);
    })
    .then(function(commit) {
        commit = that._bindCommit(commit);
        commit.files = _.map(commit.files || [], function(file) {
            file.patch = patch.parse(file.patch);
            return file;
        });

        return commit;
    });
};

module.exports = Fs;
module.exports.types = types;
