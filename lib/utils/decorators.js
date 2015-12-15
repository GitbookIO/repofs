var _ = require('lodash');

// Ensure that an async operation can be called only once at a time
function uniqueOp(opKey, fn) {
    opKey = '_op'+opKey;

    return function() {
        var that = this;
        var args = _.toArray(arguments);
        var key = _.isString(args[0])? args[0] : '';

        that[opKey] = that[opKey] || {};

        if (!that[opKey][key]) {
            that[opKey][key] = fn.apply(this, args)
            .fin(function() {
                delete that[opKey][key];
            });
        }

        return that[opKey][key];
    };
}

module.exports = {
    uniqueOp: uniqueOp
};
