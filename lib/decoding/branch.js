var Branch = require('../models/branch');

function decodeBranch(json) {
    return new Branch({
        shortName: json.shortName,
        sha: json.sha,
        remote: json.remote
    });
}

module.exports = decodeBranch;
