const { Record } = require('immutable');

const DEFAULTS = {
    ref: '',    // git reference as `refs/heads/master`,
    sha: ''     // sha1 reference
};

class Reference extends Record(DEFAULTS) {
    getRef() {
        return this.get('ref');
    }

    getSha() {
        return this.get('sha');
    }

    getLocalBranchName() {
        const ref = this.get('ref');
        return localBranchName(ref);
    }

    isLocalBranch(refstr) {
        return hasPrefix(refstr, 'refs/heads/');
    }
}

function hasPrefix(str, prefix) {
    return str.indexOf(prefix) === 0;
}

function trimPrefix(str, prefix) {
    return hasPrefix(str, prefix) ? str.slice(prefix.length) : str;
}

function localBranchName(refstr) {
    return trimPrefix(refstr, 'refs/heads/');
}

module.exports = Reference;
