var RepoState = require('../lib/repostate.js');

describe('RepoState module', function() {

    it('should initialize with current branch', function() {
        var branch = 'master';
        var state = RepoState.createWithCurrentBranch(branch);
        state.getCurrentBranch().should.eql(branch);
    });

});
