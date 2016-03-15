var _ = require('lodash');
var immutable = require('immutable');

var Change = require('../models/change');

function decodeChanges(json) {
    var changes = _.map(json, Change);

    return new immutable.OrderedMap(changes);
}

module.exports = decodeChanges;
