var util = require('util');
var _ = require('lodash');
var  DriverMemory = require('./memory');

function Driver(options, fs) {
    var that = this;
    options = _.defaults(options || {}, {
        key: "repofs"
    });

    DriverMemory.apply(this, arguments);

    if (window.localStorage[this.options.key]) {
        this.branches = JSON.parse(window.localStorage[this.options.key]);
    }

    fs.on('watch', function() {
        window.localStorage[this.options.key] = JSON.stringify(that.branches);
    });
}
util.inherits(Driver, DriverMemory);

Driver.id = "localstorage";
module.exports = Driver;
