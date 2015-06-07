var _ = require('lodash');
var Q = require('q');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var types = require('./types');
var errors = require('./errors');

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


function Fs(Driver, opts) {
    if (!(this instanceof Fs)) return (new Fs(Driver, opts));

    this.options = _.defaults(opts || {}, {
        commiter: {}
    });

    // Driver client
    this.driver = new Driver(this.options);
    this.type = Driver.id;

    // Cache of path => sha
    this.shas = {};

    _.bindAll(this);
}

util.inherits(Fs, EventEmitter);

// Bind a file object (returned from fs.stat or fs.readdir)
Fs.prototype._bindFile = function(file) {
    this.shas[file.path] = file.sha;
    file.isDirectory = file.type == types.DIRECTORY;
    return file;
};

// Trigger a watcher event
Fs.prototype.emitWatch = function(type, file) {
    var data = {
        type: type,
        path: file
    };

    this.emit('watch', data);
    this.emit('watch.'+type, data);
};

Fs.prototype.stat = refMethod(function stat(p, opts) {
    var that = this;

    return Q()
    .then(function() {
        return that.driver.stat(p, opts);
    })
    .then(_.bind(this._bindFile, this));
});

Fs.prototype.readdir = refMethod(function readdir(p, opts) {
    var that = this;

    if (_.isPlainObject(p)) {
        opts = p;
        p = null;
    }

    p = p || '';

    return Q()
    .then(function() {
        return that.driver.readdir(p, opts);
    })
    .then(function(files) {
        return _.mapValues(files, that._bindFile, that);
    });
});

Fs.prototype.read = refMethod(function read(p, opts) {
    return this.stat(p, opts).get('content');
});

Fs.prototype.write = refMethod(function write(p, content, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        message: "Update "+p,
        preventOverride: true
    });

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
        return file;
    });
});

Fs.prototype.create = refMethod(function create(p, content, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        message: "Create "+p
    });

    return Q()

    // Create file
    .then(function() {
        return that.driver.create(p, content, opts);
    })

    // Return normalized file
    .then(function(file) {
        that.emitWatch('add', p);

        if (!file) return that.stat(p, { ref: opts.ref });
        return file;
    });
});

Fs.prototype.update = refMethod(function update(p, content, opts) {
    var that = this;

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

    return that.read(from, opts)
    .then(function(content) {
        return that.write(to, content, opts);
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

module.exports = Fs;
module.exports.types = types;
