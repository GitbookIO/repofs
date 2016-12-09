require('should');

const repofs = require('../src/');

describe('RepositoryState', function() {

    describe('.createEmpty', function() {

        it('should create an empty RepoState', function() {
            const repoState = repofs.RepositoryState.createEmpty();
            repoState.should.be.ok();
            repoState.getBranches().isEmpty().should.be.true();
        });
    });
});
