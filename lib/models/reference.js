var Immutable = require('immutable');

var Reference = Immutable.Record({
    ref: '',    // git reference as `refs/heads/master`,
    sha: ''     // sha1 reference
}, 'Reference');

function hasPrefix(str, prefix) {
    return str.indexOf(prefix) === 0;
}

function trimPrefix(str, prefix) {
    return hasPrefix(str, prefix) ? str.slice(prefix.length) : str;
}

function isLocalBranch(refstr) {
    return hasPrefix(refstr, 'refs/heads/');
}

function localBranchName(refstr) {
    return trimPrefix(refstr, 'refs/heads/');
}

Reference.prototype.getRef = function() {
    return this.get('ref');
};

Reference.prototype.getSha = function() {
    return this.get('sha');
};

Reference.prototype.getLocalBranchName = function () {
    const ref = this.get('ref');
    return isLocalBranch(ref) ? localBranchName(ref) : '';
};

module.exports = Reference;
