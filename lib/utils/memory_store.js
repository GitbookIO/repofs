
// Create a simple memory store
module.exports = function() {
    var store = {};

    return {
        get: function(key) {
            return store[key];
        },
        set: function(key, val) {
            return store[key] = val;
        }
    };
};
