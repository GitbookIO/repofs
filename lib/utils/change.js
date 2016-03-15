var Change = require('../models/change');

// Push a new change to a Changes object
function pushChange(changes, fileName, change) {
    var entries = changes.getEntries();

    // Create the change
    change = new Change(change);

    // Add change to list
    var newEntries = entries.set(fileName, change);

    // Update list of entries
    return changes.set('entries', newEntries);
}

module.exports = {
    pushChange: pushChange
};
