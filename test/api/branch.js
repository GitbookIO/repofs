var immutable = require('immutable');
var Q = require('q');
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

    describe('.merge', function() {
        // Depends on previous test
        it('should merge two branches', function () {
            var intoBranch = repoState.getCurrentBranch();
            var fromBranch;
            return Q()
            .then(function createFrom() {
                return repofs.BranchUtils.create(repoState, driver, 'test-branch-merge', {
                    checkout: true
                });
            })
            .then(function prepareFrom(repoState) {
                fromBranch = repoState.getCurrentBranch();
                repoState = repofs.FileUtils.create(
                    repoState, 'merge_branch_file1', 'File 1');
                return commitAndFlush(repoState, driver, 'Head commit');
            })
            .then(function prepareInto(repoState) {
                repoState = repofs.RepoUtils.checkout(repoState, intoBranch);
                repoState = repofs.FileUtils.create(
                    repoState, 'merge_branch_file2', 'File 2');
                return commitAndFlush(repoState, driver, 'Base commit');
            })
            .then(function doMerge(repoState) {
                return repofs.BranchUtils.merge(repoState, driver, fromBranch, intoBranch, {
                    message: 'Merge branch test commit',
                    fetch: true
                });
            })
            .then(function (repoState) {
                repoState = repofs.RepoUtils.checkout(repoState, intoBranch);
                repofs.FileUtils.exists(repoState, 'merge_branch_file1');
                repofs.FileUtils.exists(repoState, 'merge_branch_file2');
                return repofs.FileUtils.fetch(repoState, driver, 'merge_branch_file1');
            })
            .then(function (repoState) {
                repofs.FileUtils.read(repoState, 'merge_branch_file1').getAsString()
                    .should.eql('File 1');
            });
        });
    });

    describe('.remove', function() {
        // Depends on previous
        it('should delete a branch', function () {
            var createdBr = repoState.getBranch('test-branch-create');
            return repofs.BranchUtils.remove(repoState, driver, createdBr)
            .then(function (_repoState) {
                should(_repoState.getBranch('test-branch-create')).be.null();
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

