var path = require('path');
var _ = require('lodash');
var Q = require('q');
var crypto = require('crypto');
var diffMatchPatch = require('diff-match-patch-node');

var types = require('../types');
var errors = require('../errors');


// Generate a new sha
function genSha() {
    var shasum = crypto.createHash('sha1');
    shasum.update(_.uniqueId('sha'));
    return shasum.digest('hex');
}

// Return diff as a string between 2 strings
function genPatch(from, to) {
    var instance = diffMatchPatch();
    var patches = instance.patch_make(from, to);
    return instance.patch_toText(patches);
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
};

Driver.prototype.mapFile = function(ref, file) {
    var isDirectory = this.isDirectory(ref, file.path)

    return {
        path: file.path,
        name: path.basename(file.path),
        size: isDirectory? 0 : file.content.length,
        content: isDirectory? undefined : file.content,
        type: isDirectory? types.DIRECTORY : types.FILE
    };
};

Driver.prototype.mapCommit = function(commit) {
    return {
        sha: commit.sha,
        author: commit.author,
        message: commit.message,
        date: commit.date
    };
};

// Check if a path is a directory
Driver.prototype.isDirectory = function(ref, p) {
    if (!p) return true;
    return !!_.find(this.branches[ref].files, function(file, filepath) {
        return (filepath != p && filepath.indexOf(p+'/') === 0);
    });
};

// Get infos for a file
Driver.prototype.stat = function(p, opts) {
    if (!this.branches[opts.ref]) throw errors.refNotFound(opts.ref);
    if (!this.branches[opts.ref].files[p]) throw errors.fileNotFound(p);

    return this.mapFile(opts.ref, this.branches[opts.ref].files[p]);
};

// List files in a directory
Driver.prototype.readdir = function(p, opts) {
    if (!this.branches[opts.ref]) throw errors.refNotFound(opts.ref);
    if (!this.isDirectory(opts.ref, p)) throw errors.notDirectory(p);

    var prepended = p;
    if (p) prepended = p + '/';

    var folders = [];

    // Extract files
    var files = _.chain(this.branches[opts.ref].files)
        .filter(function(file) {
            var isChildren = (
                file.path != p &&
                file.path.indexOf(prepended) === 0
            );
            var isDirect = _.compact(file.path.slice(prepended.length).split('/')).length == 1;
            if (isChildren && !isDirect) folders.push(file.path);

            return (isChildren && isDirect);
        })
        .map(function(file) {
            return [
                path.basename(file.path),
                this.mapFile(opts.ref, file)
            ];
        }, this)
        .object()
        .value();


    // Append folder
    _.each(folders, function(filepath) {
        var sub = filepath.slice(prepended.length);
        var name = _.first(sub.split('/'));

        files[name] = this.mapFile(opts.ref, {
            path: p? path.join(p, name) : name
        });
    }, this);


    return files;
};

// Push a commit
Driver.prototype.pushCommit = function(ref, msg, files) {
    var commit = {
        message: msg,
        sha: genSha(),
        author: this.options.commiter,
        date: Date.now(),
        files: _.map(files || [], function(file) {
            file.content = genPatch(_.get(this.branches[ref].files[file.path] || {}, "content", ""), file.content || "");
            return file;
        }, this)
    };

    this.branches[ref].commits.unshift(commit);
};

// Write a file
Driver.prototype._write = function(checkExists, p, content, opts) {
    if (!this.branches[opts.ref]) throw errors.refNotFound(opts.ref);
    if (checkExists && !this.branches[opts.ref].files[p]) throw errors.fileNotFound(p);

    this.pushCommit(opts.ref, opts.message, [{ path: p, content: content}]);
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

    this.pushCommit(opts.ref, opts.message,[{ path: p, content: null}]);
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

    // todo
};

// List commits
Driver.prototype.listCommits = function(opts) {
    if (!this.branches[opts.ref]) throw errors.refNotFound(opts.ref);

    return _.map(this.branches[opts.ref].commits, this.mapCommit, this).slice(opts.start, opts.start + opts.limit);
};

// Get a single commit
Driver.prototype.getCommit = function(sha, opts) {
    if (!this.branches[opts.ref]) throw errors.refNotFound(opts.ref);

    var commit = _.find(this.branches[opts.ref].commits, { sha: sha });
    if (!commit) throw errors.commitNotFound(sha);

    var ret = this.mapCommit(commit);
    ret.files = commit.files;
    return ret;
};

Driver.id = "memory";
module.exports = Driver;
