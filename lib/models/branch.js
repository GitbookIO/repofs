var util = require('util');
var immutable = require('immutable');

var STATUS = require('../constants/branchStatus');

var BranchRecord = immutable.Record({
    name: '',
    sha: '',
    type: STATUS.REMOTE
});

function Branch() {

}
util.inherits(File, BranchRecord);

// ---- Properties Getter ----
Branch.prototype.getName = function() {
    return this.get('name');
};

Branch.prototype.getStatus = function() {
    return this.get('status');
};

Branch.prototype.getSha = function() {
    return this.get('sha');
};

module.exports = Branch;
