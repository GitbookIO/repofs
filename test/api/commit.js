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
            repoState = initRepo;
        });
    });

    describe('.prepare -> .flush', function() {
        it('should flush a prepared commit', function () {
            // Create a file for test
            repoState = repofs.FileUtils.create(
                repoState, 'flushCommitFile', 'flushCommitContent');
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
    });

    describe('.listCommits', function() {
        // Depends on the first test
        it('should list commits on current branch', function () {
            return repofs.CommitUtils.listCommits(repoState, driver)
            .then(function (commits) {
                commits.count().should.be.greaterThan(1);
                var commit = commits.first();
                commit.getAuthor().getName().should.eql('Shakespeare');
                commit.getMessage().should.eql('Test message');
            });
        });
    });
}
