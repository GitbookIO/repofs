var _ = require('lodash');
var WorkingState = require('../models/workingState');
var immutable = require('immutable');

var decodeChange = require('./change');
var decodeTreeEntry = require('./treeEntry');

function decodeWorkingState(json) {
    var changes = new immutable.OrderedMap(_.map(json.changes, decodeChange));
    var treeEntries = new immutable.Map(_.map(json.tree, decodeTreeEntry));

    return new WorkingState({
        head: json.head,
        treeEntries: treeEntries,
        changes: changes
    });
}

module.exports = decodeWorkingState;
