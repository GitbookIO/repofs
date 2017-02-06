const Immutable = require('immutable');
const Q = require('q');
const should = require('should');
const repofs = require('../../src/');

module.exports = function(driver) {
    return describe('BranchUtils', testBranch.bind(this, driver));
};

// Test the commit API on a basic repo
function testBranch(driver) {

    let repoState;

    before(() => {
        return repofs.RepoUtils.initialize(driver)
        .then((initRepo) => {
            repoState = initRepo;
        });
    });

    describe('.create', () => {
        it('should create a branch and optionally checkout on it', () => {
            return repofs.BranchUtils.create(repoState, driver, 'test-branch-create', {
                checkout: true
            })
            .then((_repoState) => {
                // Update for next test
                repoState = _repoState;
                const master = repoState.getBranch('master');
                const createdBr = repoState.getBranch('test-branch-create');
                master.getSha().should.eql(createdBr.getSha());
                Immutable.is(createdBr, repoState.getCurrentBranch()).should.be.true();
            });
        });

    });

    describe('.merge', () => {
        // Depends on previous test
        it('should merge two branches', () => {
            let intoBranch;
            let fromBranch;
            return Q()
            .then(function createFrom() {
                repoState = repofs.RepoUtils.checkout(repoState, 'master');
                return repofs.BranchUtils.create(repoState, driver, 'test-branch-merge-from', {
                    checkout: true
                });
            })
            .then(function prepareFrom(repoState) {
                fromBranch = repoState.getCurrentBranch();
                repoState = repofs.FileUtils.create(
                    repoState, 'merge_branch_file1', 'File 1');
                return commitAndFlush(repoState, driver, 'Head commit');
            })
            .then(function createInto() {
                repoState = repofs.RepoUtils.checkout(repoState, 'master');
                return repofs.BranchUtils.create(repoState, driver, 'test-branch-merge-into', {
                    checkout: true
                });
            })
            .then(function prepareInto(repoState) {
                intoBranch = repoState.getCurrentBranch();
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
            .then((repoState) => {
                repoState = repofs.RepoUtils.checkout(repoState, intoBranch);
                repofs.FileUtils.exists(repoState, 'merge_branch_file1');
                repofs.FileUtils.exists(repoState, 'merge_branch_file2');
                return repofs.FileUtils.fetch(repoState, driver, 'merge_branch_file1');
            })
            .then((repoState) => {
                repofs.FileUtils.read(repoState, 'merge_branch_file1').getAsString()
                    .should.eql('File 1');
            });
        });

        it('should fail with merge conflict', () => {
            let intoBranch;
            let fromBranch;
            return Q()
            .then(function createFrom() {
                repoState = repofs.RepoUtils.checkout(repoState, 'master');
                return repofs.BranchUtils.create(repoState, driver, 'test-branch-merge-conflict-from', {
                    checkout: true
                });
            })
            .then(function prepareFrom(repoState) {
                fromBranch = repoState.getCurrentBranch();
                repoState = repofs.FileUtils.create(
                    repoState, 'merge_branch_conflict', 'Content 1');
                return commitAndFlush(repoState, driver, 'Head commit');
            })
            .then(function createInto() {
                repoState = repofs.RepoUtils.checkout(repoState, 'master');
                return repofs.BranchUtils.create(repoState, driver, 'test-branch-merge-conflict-into', {
                    checkout: true
                });
            })
            .then(function prepareInto(repoState) {
                intoBranch = repoState.getCurrentBranch();
                repoState = repofs.FileUtils.create(
                    repoState, 'merge_branch_conflict', 'Content 2');
                return commitAndFlush(repoState, driver, 'Base commit');
            })
            .then(function doMerge(repoState) {
                return repofs.BranchUtils.merge(repoState, driver, fromBranch, intoBranch, {
                    message: 'Merge branch conflict',
                    fetch: true
                });
            })
            .then(() => {
                should.fail('CONFLICT was not detected');
            }, (err) => {
                err.code.should.eql(repofs.ERRORS.CONFLICT);
            });
        });
    });

    describe('.update', () => {
        it('should update an old branch that was updated on the repo', () => {
            let oldBranchState;
            let updatedBranch;

            return repofs.BranchUtils.create(repoState, driver, 'test-branch-update', {
                checkout: true
            })
            .then((_repoState) => {
                oldBranchState = _repoState;
                return commitAndFlush(_repoState, driver, 'New commit');
            })
            .then((_repoState) => {
                updatedBranch = _repoState.getCurrentBranch();
                return repofs.BranchUtils.update(oldBranchState, driver, 'test-branch-update');
            })
            .then((_repoState) => {
                Immutable.is(updatedBranch, _repoState.getCurrentBranch()).should.be.true();
            });
        });
    });

    describe('.remove', () => {
        // Depends on previous
        it('should delete a branch', () => {
            const createdBr = repoState.getBranch('test-branch-create');
            return repofs.BranchUtils.remove(repoState, driver, createdBr)
            .then((_repoState) => {
                should(_repoState.getBranch('test-branch-create')).be.null();
            });
        });
    });
}

function commitAndFlush(repoState, driver, message) {
    const commitBuilder = repofs.CommitUtils.prepare(repoState, {
        author: repofs.Author.create({
            name: 'Shakespeare',
            email: 'shakespeare@hotmail.com'
        }),
        message
    });

    return repofs.CommitUtils.flush(repoState, driver, commitBuilder);
}
