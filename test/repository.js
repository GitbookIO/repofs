require('should');

const repofs = require('../src/');

describe('RepositoryState', () => {

    describe('.createEmpty', () => {

        it('should create an empty RepoState', () => {
            const repoState = repofs.RepositoryState.createEmpty();
            repoState.should.be.ok();
            repoState.getBranches().isEmpty().should.be.true();
        });
    });
});
