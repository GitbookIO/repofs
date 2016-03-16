var _ = require('lodash');
var immutable = require('immutable');

var Change = require('../models/change');

function decodeChange(json) {
    return new Change(json);
}

module.exports = decodeChange;
