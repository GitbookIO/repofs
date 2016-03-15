var Change = require('../models/change');

// Push a new change to a Changes object
function pushChange(changes, fileName, change) {
    // Create the change
    change = new Change(change);

    // Add change to list
    return changes.set(fileName, change);
}

module.exports = {
    pushChange: pushChange
};
