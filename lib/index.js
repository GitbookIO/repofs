var _ = require('lodash');
var Q = require('q');

function Fs(Driver, opts) {
    if (!(this instanceof Fs)) return (new Fs(Driver, opts));

    this.options = _.defaults(opts || {}, {
        commiter: {}
    });
    this.driver = new Driver(this.options);
}

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
        ref: "master"
    });

    return Q()
    .then(function() {
        return that.driver.write(p, content, opts);
    });
};

module.exports = Fs;
