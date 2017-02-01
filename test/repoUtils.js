require('should');

const repofs = require('../src/');
const mock = require('./mock');

describe('RepoUtils', () => {

    describe('.isClean', () => {

        it('should be true for if repo has no change', () => {
            const repoState = mock.DEFAULT_BOOK;
            repofs.RepoUtils.isClean(repoState).should.equal(true);
        });

        it('should be true for if current branch has changes', () => {
            let repoState = mock.DEFAULT_BOOK;
            repoState = repofs.FileUtils.write(repoState, 'README.md', 'New content');
            repofs.RepoUtils.isClean(repoState).should.equal(false);
        });

        it('should be true for if repo has some unclean working states', () => {
            let repoState = mock.DEFAULT_BOOK;
            const branch = new repofs.Branch({
                name: 'newBranch',
                sha: 'abc'
            });

            // Change branch
            repoState = repoState
                .set('branches', repoState.getBranches().push(branch))
                .set(
                    'workingStates',
                    repoState.getWorkingStates().set(
                        branch.getFullName(),
                        repoState.getCurrentState()
                    )
                )
                .set('currentBranchName', branch.getFullName());

            repoState = repofs.FileUtils.write(repoState, 'README.md', 'New content');
            repofs.RepoUtils.isClean(repoState).should.equal(false);
        });
    });
});

