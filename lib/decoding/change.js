var _ = require('lodash');
var immutable = require('immutable');

var CHANGE_TYPE = require('../constants/changeType');
var Change = require('../models/change');

function decodeChange(json) {
    // Useless optimization to use the original String reference
    var typeKey = _.findKey(CHANGE_TYPE, _.eq(json.type));
    if(!typeKey) {
        throw new Error('Unrecognized change type');
    }
    var type = CHANGE_TYPE[typeKey];

    var content = new Buffer(json.content, 'base64');

    return new Change({
        type: type,
        content: content,
        sha: json.sha,
        message: json.message
    });
}

module.exports = decodeChange;
