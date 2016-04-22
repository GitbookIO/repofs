var immutable = require('immutable');

var Branch = immutable.Record({
    name: '', // Such as 'master'
    sha: '', // SHA for the pointing commit
    remote: '' // Potential remote name such as 'origin'. Empty for no remote
}, 'Branch');

// ---- Properties Getter ----

/**
 * Returns the full name for the branch, such as 'origin/master'
 * This is used as key and should be unique
 */
Branch.prototype.getFullName = function() {
    if(this.isRemote()) {
        return this.getRemote() + '/' + this.getName();
    } else {
        return this.getName();
    }
};

Branch.prototype.getRemote = function() {
    return this.get('remote');
};

Branch.prototype.isRemote = function() {
    return this.getRemote() !== '';
};

Branch.prototype.getName = function() {
    return this.get('name');
};

Branch.prototype.getSha = function() {
    return this.get('sha');
};

Branch.prototyp.setRemote = function (name) {
    return this.set('remote', name);
};

// ---- Static ----

Branch.encode = function (branch) {
    return branch.toJS();
};

Branch.decode = function(json) {
    return new Branch(json);
};


module.exports = Branch;
