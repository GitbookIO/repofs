var _ = require('lodash');
var Q = require('q');

var types = require('./types');

function Fs(Driver, opts) {
    if (!(this instanceof Fs)) return (new Fs(Driver, opts));

    this.options = _.defaults(opts || {}, {
        commiter: {}
    });
    this.driver = new Driver(this.options);
}

Fs.prototype.stat = function stat(p, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        ref: "master"
    });

    return Q()
    .then(function() {
        return that.driver.stat(p, opts);
    });
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
    });
};


Fs.prototype.read = function read(p, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        ref: "master"
    });

    return Q()
    .then(function() {
        return that.driver.read(p, opts);
    });
};

Fs.prototype.write = function write(p, content, opts) {
    var that = this;

    opts = _.defaults(opts || {}, {
        message: "Update "+p,
        ref: "master"
    });

    return Q()
    .then(function() {
        return that.driver.write(p, content, opts);
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

module.exports = Fs;
module.exports.types = types;
