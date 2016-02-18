var CHANGE = {
    UPDATE: 'update',
    CREATE: 'create',
    REMOVE: 'remove'
};

// Inverse of change type
var REVERT_CHANGE = {
    update: 'update',
    create: 'remove',
    remove: 'create'
};

module.exports = CHANGE;
module.exports.REVERT = REVERT_CHANGE;