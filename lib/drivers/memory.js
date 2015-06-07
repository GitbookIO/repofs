var path = require('path');
var _ = require('lodash');
var Q = require('q');
var crypto = require('crypto');

var types = require('../types');
var errors = require('../errors');

function genSha() {
    var shasum = crypto.createHash('sha1');
    shasum.update(_.uniqueId('sha'));
    return shasum.digest('hex');
}

function Driver(options) {
    this.options = _.defaults(options || {}, {
        files: {}
    });
    if (!this.options.files || _.size(this.options.files) == 0) throw "Need at least one file";

    this.branches = {
        master: {
            name: "master",
            commits: [],
            files: {}
        }
    };

    _.each(this.options.files, function(content, filepath) {
        this.create(filepath, content, {
            message: "Initial commit",
            ref: "master"
        });
    }, this);
}

Driver.prototype.mapBranch = function (branch) {
    return {
        name: branch.name,
        commit: _.last(branch.commits).sha
    };
}

Driver.prototype.mapFile = function(ref, file) {
    return {
        path: file.path,
        name: path.basename(file.path),
        size: file.content.length,
        content: file.content,
        type: this.isDirectory(ref, file.path)? types.DIRECTORY : types.FILE
    };
}

// Check if a path is a directory
Driver.prototype.isDirectory = function(ref, p) {
    return !!_.find(this.branches[ref].files, function(file, filepath) {
        return (filepath != p && filepath.indexOf(p) === 0);
    });
};

// Get infos for a file
Driver.prototype.stat = function(p, opts) {
    if (!this.branches[opts.ref]) throw errors.refNotFound(opts.ref);

    return this.mapFile(opts.ref, this.branches[opts.ref].files[p]);
};

// List files in a directory
Driver.prototype.readdir = function(p, opts) {
    if (!this.branches[opts.ref]) throw errors.refNotFound(opts.ref);
    if (!this.isDirectory(opts.ref, p)) throw "Not a directory";

    return _.chain(this.branches[opts.ref].files)
        .filter(function(file) {
            return(
                file.path != p &&
                file.path.indexOf(p) === 0 &&
                _.compact(file.path.slice(p.length).split('/')).length == 1
            );
        })
        .map(function(file) {
            return [
                path.basename(file.path),
                this.mapFile(opts.ref, file)
            ];
        }, this)
        .object()
        .value();
};

// Push a commit
Driver.prototype.pushCommit = function(ref, msg, files) {
    var commit = {
        message: msg,
        sha: genSha(),
        files: files
    };

    this.branches[ref].commits.push(commit);
};

// Write a file
Driver.prototype._write = function(checkExists, p, content, opts) {
    if (!this.branches[opts.ref]) throw errors.refNotFound(opts.ref);
    if (checkExists && !this.branches[opts.ref].files[p]) throw errors.fileNotFound(p);

    this.pushCommit(opts.ref, opts.message, _.object([[p, content]]));
    this.branches[opts.ref].files[p] = {
        path: p,
        content: content
    };

    return this.mapFile(opts.ref, this.branches[opts.ref].files[p]);

};
Driver.prototype.write = _.partial(Driver.prototype._write, true)
Driver.prototype.create = _.partial(Driver.prototype._write, false)

// Delete a file
Driver.prototype.unlink = function(p, opts) {
    if (!this.branches[opts.ref]) throw errors.refNotFound(opts.ref);

    this.pushCommit(opts.ref, opts.message, _.object([[p, null]]));
    delete this.branches[opts.ref].files[p];
};

// List branches
Driver.prototype.listBranches = function(p, opts) {
    return _.map(this.branches, this.mapBranch, this);
};

// Create a branch
Driver.prototype.createBranch = function(name, from) {
    if (this.branches[name]) throw "Branch '"+name+"' already exists";
    if (!this.branches[from]) throw "Branch '"+from+"' doesn't exist";

    this.branches[name] = _.cloneDeep(this.branches[from]);
    this.branches[name].name = name;
    return this.mapBranch(this.branches[name]);
};

// Remove a branch
Driver.prototype.removeBranch = function(name) {
    if (!this.branches[name]) throw "Branch '"+name+"' doesn't exist";
    delete this.branches[name];
};

// Merge branches
Driver.prototype.mergeBranches = function(from, to, opts) {
    var that = this;

};

Driver.id = "memory";
module.exports = Driver;
