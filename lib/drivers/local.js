var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Q = require('q');

function Driver(options) {
    this.options = _.defaults(options || {}, {
        root: null
    });

    this.current = Q();

    if (!this.options.root) throw "Local driver requires a 'root' option";
}

// Return an absolute path to a file in the repo
Driver.prototype.path = function(p) {
    p = path.resolve(this.options.root, p);

    if (p.indexOf(this.options.root) !== 0) {
        throw "Path is out of scope: "+p;
    }

    return p;
};

// Add a task to the queue
Driver.prototype.queue = function(fn, opts) {
    this.current =  this.current.then(fn, fn);

    return this.current;
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

module.exports = Driver;

