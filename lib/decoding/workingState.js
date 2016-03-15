var WorkingState = require('../models/workingState');

var decodeChanges = require('./changes');

function decodeWorkingState(json) {
    var changes = decodeChanges(json.changes);

    return new WorkingState({
        changes: changes
    });
}

module.exports = decodeWorkingState;
