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
function uniqueOp(key, fn) {
    key = '_op'+key;

    return function() {
        var that = this;
        var args = _.toArray(arguments);

        if (that[key]) return that[key];

        that[key] = fn.apply(this, args);
        .fin(function() {
            delete that[key];
        });

        return that[key];
    };
}

module.exports = {
    ref: refMethod,
    uniqueOp: uniqueOp
};
