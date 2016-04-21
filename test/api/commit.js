var should = require('should');
var Q = require('q');
var repofs = require('../../');

module.exports = function (driver) {
    return describe('CommitUtils', testCommit.bind(this, driver));
};

// Test the commit API on a basic repo
function testCommit(driver) {

    var repoState;

    before(function () {
        return repofs.RepoUtils.initialize(driver)
        .then(function (initRepo) {
            return repofs.BranchUtils.create(initRepo, driver, 'test-commit', {
                checkout: true
            });
        })
        .then(function (branchedRepo) {
            repoState = branchedRepo;
        });
    });

    describe('.flush', function() {
        it('should flush a prepared commit', function () {
            // Create a file for test
            repoState = repofs.FileUtils.create(
                repoState, 'flushCommitFile', 'Flush CommitContent');
            var commitBuilder = repofs.CommitUtils.prepare(repoState, {
                author: repofs.Author.create('Shakespeare', 'shakespeare@hotmail.com'),
                message: 'Test message'
            });

            return repofs.CommitUtils.flush(repoState, driver, commitBuilder)
            .then(function (newState) {
                repoState = newState;
                // No more pending changes
                repoState.getCurrentState().isClean().should.be.true();

                // The file was created
                repofs.FileUtils.exists(repoState, 'flushCommitFile').should.be.true();
            });
        });

        it('should detect not fast forward errors', function () {
            // Simulate another person trying to commit
            var otherState = repofs.FileUtils.create(
                repoState, 'not_ff_detection', 'I will get a NOT_FAST_FORWARD');
            // Make a change
            repoState = repofs.FileUtils.create(
                repoState, 'not_ff_detection', 'Not ff detection');

            return commitAndFlush(repoState, driver, 'Not ff detection')
            .then(function (_repoState) {
                repoState = _repoState;
                return commitAndFlush(otherState, driver, 'Not ff detection');
            })
            .then(function () {
                should.fail('NOT_FAST_FORWARD was not detected');
            }, function (err) {
                err.code.should.eql(repofs.ERRORS.NOT_FAST_FORWARD);
                // Should have the created commit available for merging
                err.commit.should.be.ok();
            });
        });
    });

    describe('.fetchList', function() {
        // Depends on the first test
        it('should list commits on current branch', function () {
            var listTestState = repofs.RepoUtils.checkout(repoState, 'master');

            return repofs.BranchUtils.create(listTestState, driver, 'test-list-commit', {
                checkout: true
            })
            .then(function (listTestState) {
                return commitAndFlush(listTestState, driver, 'List commit test');
            })
            .then(function (listTestState) {
                return repofs.CommitUtils.fetchList(driver, {
                    branch: listTestState.getCurrentBranch()
                });
            })
            .then(function (commits) {
                commits.count().should.be.greaterThan(1);
                var commit = commits.first();
                commit.getAuthor().getName().should.eql('Shakespeare');
                commit.getMessage().should.eql('List commit test');
            });
        });
    });

}

function commitAndFlush(repoState, driver, message) {
    var commitBuilder = repofs.CommitUtils.prepare(repoState, {
        author: repofs.Author.create('Shakespeare', 'shakespeare@hotmail.com'),
        message: message
    });

    return repofs.CommitUtils.flush(repoState, driver, commitBuilder);
}
