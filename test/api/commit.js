const should = require('should');
const repofs = require('../../src/');

module.exports = function(driver) {
    return describe('CommitUtils', testCommit.bind(this, driver));
};

// Test the commit API on a basic repo
function testCommit(driver) {

    let repoState;

    before(() => {
        return repofs.RepoUtils.initialize(driver)
        .then((initRepo) => {
            return repofs.BranchUtils.create(initRepo, driver, 'test-commit', {
                checkout: true
            });
        })
        .then((branchedRepo) => {
            repoState = branchedRepo;
        });
    });

    describe('.flush', () => {
        it('should flush a prepared commit', () => {
            // Create a file for test
            repoState = repofs.FileUtils.create(
                repoState, 'flushCommitFile', 'Flush CommitContent');
            const commitBuilder = repofs.CommitUtils.prepare(repoState, {
                author: repofs.Author.create({
                    name: 'Shakespeare',
                    email: 'shakespeare@hotmail.com'
                }),
                message: 'Test message'
            });

            return repofs.CommitUtils.flush(repoState, driver, commitBuilder)
            .then((newState) => {
                repoState = newState;
                // No more pending changes
                repoState.getCurrentState().isClean().should.be.true();

                // The file was created
                repofs.FileUtils.exists(repoState, 'flushCommitFile').should.be.true();
            });
        });

        it('should detect not fast forward errors', () => {
            // Simulate another person trying to commit
            const otherState = repofs.FileUtils.create(
                repoState, 'not_ff_detection', 'I will get a NOT_FAST_FORWARD');
            // Make a change
            repoState = repofs.FileUtils.create(
                repoState, 'not_ff_detection', 'Not ff detection');

            return emptyCommitAndFlush(repoState, driver, 'Not ff detection')
            .then((_repoState) => {
                repoState = _repoState;
                return emptyCommitAndFlush(otherState, driver, 'Not ff detection');
            })
            .then(() => {
                should.fail('NOT_FAST_FORWARD was not detected');
            }, (err) => {
                err.code.should.eql(repofs.ERRORS.NOT_FAST_FORWARD);
                // Should have the created commit available for merging
                err.commit.should.be.ok();
            });
        });
    });

    describe('.fetchList', () => {
        it('should list commits on current branch', () => {
            // Work on a different branch
            const listTestState = repofs.RepoUtils.checkout(repoState, 'master');

            return repofs.BranchUtils.create(listTestState, driver, 'test-list-commit', {
                checkout: true
            })
            .then((listTestState) => {
                return emptyCommitAndFlush(listTestState, driver, 'List commit test');
            })
            .then((listTestState) => {
                return repofs.CommitUtils.fetchList(driver, {
                    branch: listTestState.getCurrentBranch()
                });
            })
            .then((commits) => {
                commits.count().should.be.greaterThan(1);
                const commit = commits.first();
                commit.getAuthor().getName().should.eql('Shakespeare');
                commit.getMessage().should.eql('List commit test');
            });
        });
    });

}

function emptyCommitAndFlush(repoState, driver, message) {
    const commitBuilder = repofs.CommitUtils.prepare(repoState, {
        author: repofs.Author.create({
            name: 'Shakespeare',
            email: 'shakespeare@hotmail.com'
        }),
        message
    });

    return repofs.CommitUtils.flush(repoState, driver, commitBuilder, {
        ignoreEmpty: false
    });
}
