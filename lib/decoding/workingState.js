var _ = require('lodash');
var WorkingState = require('../models/workingState');
var immutable = require('immutable');

var decodeChange = require('./change');
var decodeTreeEntry = require('./treeEntry');

function decodeWorkingState(json) {
    var changes = _.map(json.changes, decodeChange);
    changes = new immutable.OrderedMap(changes);

    var treeEntries = _.map(json.tree, decodeTreeEntry);
    treeEntries = new immutable.Map(treeEntries);

    return new WorkingState({
        tree: treeEntries,
        changes: changes
    });
}

module.exports = decodeWorkingState;
