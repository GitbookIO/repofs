const { Record } = require('immutable');
const Commit = require('./commit');

const DEFAULTS = {
    // Such as 'master'
    name:   '',
    // Pointing commit
    commit: new Commit(),
    // Potential remote name such as 'origin'. Empty for no remote
    remote: ''
};

class Branch extends Record(DEFAULTS) {
    // ---- Properties Getter ----

    get sha() {
        return this.commit.sha;
    }

    /**
     * Returns the full name for the branch, such as 'origin/master'
     * This is used as key and should be unique
     */
    getFullName() {
        if (this.isRemote()) {
            return `${this.remote}/${this.name}`;
        } else {
            return this.name;
        }
    }

    getRemote() {
        return this.get('remote');
    }

    isRemote() {
        return this.remote !== '';
    }

    getName() {
        return this.get('name');
    }

    getSha() {
        return this.sha;
    }

    setRemote(name) {
        return this.set('remote', name);
    }

    // ---- Static ----

    static encode(branch) {
        return {
            name: branch.name,
            remote: branch.remote,
            commit: Commit.encode(branch.commit)
        };
    }

    static decode(json) {
        const { name, remote, commit } = json;

        return new Branch({
            name,
            remote,
            commit: Commit.decode(commit)
        });
    }
}

module.exports = Branch;
