var _ = require('lodash');
var Q = require('q');

var types = require('./types');
var errors = require('./errors');

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
}

Fs.prototype._bindFile = function(file) {
    this.shas[file.path] = file.sha;
    file.isDirectory = file.type == types.DIRECTORY;
    return file;
}

Fs.prototype.stat = function stat(p, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        ref: "master"
    });

    return Q()
    .then(function() {
        return that.driver.stat(p, opts);
    })
    .then(_.bind(this._bindFile, this));
};

Fs.prototype.readdir = function readdir(p, opts) {
    var that = this;

    p = p || '';
    opts = _.defaults(opts || {}, {
        ref: "master"
    });

    return Q()
    .then(function() {
        return that.driver.readdir(p, opts);
    })
    .then(function(files) {
        return _.mapValues(files, that._bindFile, that);
    });
};

Fs.prototype.read = function read(p, opts) {
    return this.stat(p, opts).get('content');
};

Fs.prototype.write = function write(p, content, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        message: "Update "+p,
        ref: "master",
        preventOverride: true
    });

    return Q()

    // Prevent ovveride
    .then(function() {
        if (!opts.preventOverride) return;

        // Get sha of file on disk
        return that.driver.stat(p, { ref: opts.ref })
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
        if (!file) return that.stat(p, { ref: opts.ref });
        return file;
    });
};

Fs.prototype.create = function create(p, content, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        message: "Create "+p,
        ref: "master"
    });

    return Q()

    // Create file
    .then(function() {
        return that.driver.create(p, content, opts);
    })

    // Return normalized file
    .then(function(file) {
        if (!file) return that.stat(p, { ref: opts.ref });
        return file;
    });
};

Fs.prototype.exists = function exists(p, opts) {
    return this.stat(p, opts)
    .then(function() {
        return true;
    }, function() {
        return Q(false);
    });
};

Fs.prototype.unlink = function unlink(p, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        message: "Delete "+p,
        ref: "master"
    });

    return Q()
    .then(function() {
        return that.driver.unlink(p, opts);
    })
    .thenResolve(null);
};

Fs.prototype.move = function move(from, to, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        ref: "master"
    });

    return that.read(from, opts)
    .then(function(content) {
        return that.write(to, content, opts);
    })
    .then(function(newFile) {
        return that.unlink(from)
        .thenResolve(newFile);
    });
};

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
