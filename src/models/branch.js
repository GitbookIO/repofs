const { Record } = require('immutable');

const DEFAULTS = {
    // Such as 'master'
    name:   '',
    // SHA for the pointing commit
    sha:    '',
    // Potential remote name such as 'origin'. Empty for no remote
    remote: ''
};

class Branch extends Record(DEFAULTS) {
    // ---- Properties Getter ----

    /**
     * Returns the full name for the branch, such as 'origin/master'
     * This is used as key and should be unique
     */
    getFullName() {
        if (this.isRemote()) {
            return this.getRemote() + '/' + this.getName();
        } else {
            return this.getName();
        }
    }

    getRemote() {
        return this.get('remote');
    }

    isRemote() {
        return this.getRemote() !== '';
    }

    getName() {
        return this.get('name');
    }

    getSha() {
        return this.get('sha');
    }

    setRemote(name) {
        return this.set('remote', name);
    }

    // ---- Static ----

    static encode(branch) {
        return branch.toJS();
    }

    static decode(json) {
        return new Branch(json);
    }
}

module.exports = Branch;
