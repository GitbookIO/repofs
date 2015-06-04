var _ = require('lodash');

function Fs(Driver, opts) {
    if (!(this instanceof Fs)) return (new Fs(Driver, opts));

    this.options = _.defaults(opts || {}, {
        commiter: {}
    });
}

Fs.prototype.read = function read(p, opts) {

}


module.exports = Fs;
