require('should');

var repofs = require('../');

describe('RepositoryState', function() {

    describe('.createEmpty', function() {

        it('should create an empty RepoState', function() {
            var repoState = repofs.RepositoryState.createEmpty();
            repoState.should.be.ok();
            repoState.getBranches().isEmpty().should.be.true();
        });
    });
});
