var immutable = require('immutable');
var should = require('should');
var repofs = require('../../');

module.exports = function (driver) {
    return describe('BranchUtils', testBranch.bind(this, driver));
};

// Test the commit API on a basic repo
function testBranch(driver) {

    var repoState;

    before(function () {
        return repofs.RepoUtils.initialize(driver)
        .then(function (initRepo) {
            repoState = initRepo;
        });
    });

    describe('.create', function() {
        it('should create a branch and optionally checkout on it', function () {
            return repofs.BranchUtils.create(repoState, driver, 'test-branch-create', {
                checkout: true
            })
            .then(function (_repoState) {
                // Update for next test
                repoState = _repoState;
                var master = repoState.getBranch('master');
                var createdBr = repoState.getBranch('test-branch-create');
                master.getSha().should.eql(createdBr.getSha());
                immutable.is(createdBr, repoState.getCurrentBranch()).should.be.true();
            });
        });

    });

    describe('.remove', function() {
            // Depends on previous
        it('should delete a branch', function () {
            var createdBr = repoState.getBranch('test-branch-create');
            return repofs.BranchUtils.remove(repoState, driver, createdBr)
            .then(function (_repoState) {
                repoState.getBranch('test-branch-create').should.be.null();
            });
        });
    });
}
