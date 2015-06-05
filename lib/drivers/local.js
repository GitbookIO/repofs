var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Q = require('q');
var Gittle = require('gittle');

var types = require('../types');
var errors = require('../errors');

function statsToType(stats) {
    if (stats.isDirectory()) return types.DIRECTORY;
    return types.FILE;
}

function Driver(options) {
    this.options = _.defaults(options || {}, {
        root: null
    });
    if (!this.options.root) throw "Local driver requires a 'root' option";
    this.root = path.resolve(this.options.root);

    // Current operation
    this.current = Q();

    // GIT repo
    this.repo = new Gittle(this.root);
}

// Return an absolute path to a file in the repo
Driver.prototype.path = function(p) {
    p = path.resolve(this.root, p);

    if (p.indexOf(this.root) !== 0) {
        throw "Path is out of scope: "+p;
    }

    return p;
};

// Transform an absolute path to relative to this repo
Driver.prototype.relative = function(p) {
    p = path.relative(this.root, p);

    if (p.indexOf('..') === 0) {
        throw "Path is out of scope: "+p;
    }

    return p;
};

// Add a function to the operations queue
Driver.prototype.queue = function(fn, opts) {
    var branch, that = this;
    opts = _.defaults(opts || {}, {

    });

    this.current =  this.current
        .fail(function() { return Q(); })

        // Switch to required branch
        .then(function() {
            return that.repo.current_branch()
            .then(function(_branch) {
                branch = _branch;

                if (opts.ref == branch) return;
                return that.repo.checkout(opts.ref);
            });
        })

        // Execute function
        .then(fn, fn)

        // Switch back to previous ref
        .fin(function() {
            if (opts.ref == branch) return;
            return that.repo.checkout(branch);
        });

    return this.current;
};

// Get infor for a file
Driver.prototype._stat = function(p, opts) {
    var that = this;
    p = this.path(p);
    var relativePath = this.relative(p);
    var tree = that.repo.tree(opts.ref)

    return Q.nfcall(fs.stat, p)
    .then(function(stats) {
        return tree.find(relativePath)
        .then(function(file) {
            if (!file) return null;

            return {
                name: path.basename(p),
                path: relativePath,
                type: statsToType(stats),
                sha: file.id
            };
        });
    });
};

// Get infos for a file
Driver.prototype.stat = function(p, opts) {
    var that = this;

    return this.queue(function() {
        return that._stat(p, opts)
        .then(function(stats) {
            if (!stats) throw "File doesn't exist";
            return stats;
        });
    }, {
        ref: opts.ref
    });
};


// Read a file
Driver.prototype.read = function(p, opts) {
    p = this.path(p);

    return this.queue(function() {
        return Q.nfcall(fs.readFile, p, 'utf-8');
    }, {
        ref: opts.ref
    });
};

// List files in a directory
Driver.prototype.readdir = function(p, opts) {
    var that = this;

    return this.queue(function() {
        // List files
        return Q.nfcall(fs.readdir, that.path(p))
        .then(function(files) {

            // Stat for each file
            return _.reduce(files, function(prev, file) {
                return prev.then(function(r) {
                    return that._stat(path.join(p, file), opts)
                    .then(function(stats) {
                        if (stats) r[stats.name] = stats;
                        return r;
                    })
                });
            }, Q({}));
        });
    }, {
        ref: opts.ref
    });
};

// Write a file without checking existance
Driver.prototype._write = function(p, content, opts) {
    p = this.path(p);

    return Q.nfcall(fs.writeFile, p, content, 'utf-8')
    .then(function() {

        // Commit changes
        return that.repo.commitWith(
            that.options.commiter.name,
            that.options.commiter.email,
            opts.message,
            [that.relative(p)]
        );
    });
};

// Write a file
Driver.prototype.write = function(p, content, opts) {
    var that = this;

    return this.queue(function() {
        var exists = fs.exists(p);
        if (!exists) throw errors.fileNotFound(p);

        // Write file on disk
        return that._write(p, content, opts);
    }, {
        ref: opts.ref
    });
};

// Create a file
Driver.prototype.create = function(p, content, opts) {
    var that = this;

    return this.queue(function() {
        return that._write(p, content, opts);
    }, {
        ref: opts.ref
    });
};

// Delete a file
Driver.prototype.unlink = function(p, opts) {
    var that = this;

    return this.queue(function() {
        return Q.nfcall(fs.unlink, that.path(p))
        .then(function() {
            // Commit changes
            return that.repo.commitWith(
                that.options.commiter.name,
                that.options.commiter.email,
                opts.message,
                [that.relative(p)]
            );
        });
    }, {
        ref: opts.ref
    });
};

Driver.id = "local";
module.exports = Driver;
