var _ = require('lodash');

// Bind and ensure validity of argument for method on ref
function refMethod(fn) {
    return function() {
        var args = _.toArray(arguments);
        if (!_.isPlainObject(_.last(args))) {
            args.push({});
        }

        args[args.length - 1] = _.defaults({}, args[args.length - 1], {
            ref: "master"
        });

        if (!args[args.length - 1].ref) return Q.reject(errors.invalidArgs('Need valid "ref" options'));
        return fn.apply(this, args);
    }
}

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
    ref: refMethod,
    uniqueOp: uniqueOp
};
