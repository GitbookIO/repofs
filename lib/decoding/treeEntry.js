var TreeEntry = require('../models/treeEntry');

function decodeTreeEntry(json) {
    return new TreeEntry(json);
}

module.exports = decodeTreeEntry;
