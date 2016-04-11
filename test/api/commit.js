var immutable = require('immutable');
var repofs = require('../../');

module.exports = function (driver) {
    return describe('CommitUtils', testCommit.bind(this, driver));
};

// Test the commit API on a basic repo
function testCommit(driver) {
    describe('.prepare -> .flush', function() {
        it('should flush a prepared commit', function () {
            repofs.RepoUtils.initialize(driver)
            .then(function (repoState) {
                // Create a file for test
                repoState = repofs.FileUtils.create(
                    repoState, 'flushCommitFile', 'flushCommitContent');
                var commitBuilder = repofs.CommitUtils.prepare(repoState, {
                    author: 'Shakespeare',
                    message: 'Test message'
                });

                repofs.CommitUtils.flush(commitBuilder)
                .then(function (repoState) {
                    // No more pending changes
                    repoState.getCurrentState().isClean().should.be.true();

                    // The file was created
                    repofs.FileUtils.exists(repoState, 'flushCommitFile').should.be.true();
                });
            });
        });
    });
}
