var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Q = require('q');

function Driver(options) {
    this.options = _.defaults(options || {}, {
        root: null
    });

    if (!this.options.root) throw "Local driver requires a 'root' option";
}

// Return an absolute path to a file in the repo
Driver.prototype.path = function(p) {
    p = path.resolve(this.root, p);

    if (p.indexOf(this.root) !== 0) {
        throw "Path is out of scope: "+p;
    }

    return p;
};

// Add a task to the queue
Driver.prototype.queue = function(fn, opts) {
    return Q.reject(new Error('test'));
};

// Read a file
Driver.prototype.read = function(p, opts) {
    return this.queue(function() {
        return Q.nfcall(fs.readFile, this.path(p), { encoding: 'utf-8' });
    }, {
        ref: opts.ref
    });
};

module.exports = Driver;

