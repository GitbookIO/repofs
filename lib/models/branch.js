var immutable = require('immutable');

var Branch = immutable.Record({
    shortName: '', // Such as 'master'
    sha: '',
    fetched: false,
    remote: '' // Potential remote name such as 'origin'. Empty for no remote
});

// ---- Properties Getter ----

// Returns the full name for the branch, such as 'origin/master'
// This is used as key and should be unique
Branch.prototype.getName = function() {
    return this.getRemote() + this.getShortName();
};

Branch.prototype.isFetched = function() {
    return this.get('fetched');
};

Branch.prototype.getRemote = function() {
    return this.get('remote');
};

Branch.prototype.isRemote = function() {
    return this.getRemote() !== '';
};

Branch.prototype.getShortName = function() {
    return this.get('shortName');
};

Branch.prototype.getSha = function() {
    return this.get('sha');
};

module.exports = Branch;
