var _ = require('lodash');

// Create a simple memory store
module.exports = function() {
    var store = {};

    return {
        get: function(key) {
            return store[key]? _.cloneDeep(store[key]) : undefined;
        },
        set: function(key, val) {
            return store[key] = val;
        }
    };
};
