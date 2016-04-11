var immutable = require('immutable');
var Q = require('q');
var repofs = require('../');

// Tests a driver set on a repo initialized with empty README.md
function testDriver(driver) {
    function findBranch(driver, fullname) {
        return driver.fetchBranches()
        .then(function find(branches) {
            return branches.find(function (br) {
                return br.getFullName() === fullname;
            });
        });
    }

    describe('.fetchBranches', function() {
        it('should list existing branches', function() {
            return driver.fetchBranches()
            .then(function (branches) {
                (branches instanceof immutable.List).should.be.true();
                branches.count().should.eql(1);
                var branch = branches.first();
                branch.getFullName().should.eql('master');
            });
        });
    });

    describe('.createBranch', function() {
        it('should clone a branch', function() {
            return findBranch(driver, 'master')
            .then(function (master) {
                return driver.createBranch(master, 'master-clone')
                .then(function (branch) {
                    return Q.all([
                        branch,
                        findBranch(driver, 'master-clone')
                    ]);
                })
                .spread(function (returned, fetched) {
                    immutable.is(returned, fetched).should.be.true();
                    fetched.getSha().should.eql(master.getSha());
                });
            });
        });
    });

    describe('.fetchWorkingState', function() {
        it('should fetch a WorkingState of a basic repo', function () {
            return Q.all([
                findBranch(driver, 'master'),
                driver.fetchWorkingState('master')
            ])
            .spread(function (master, workingState) {
                workingState.getHead().should.eql(master.getSha());
                var readme = workingState.getTreeEntries().get('README.md');
                readme.should.be.ok();
                workingState.getChanges().isEmpty().should.be.true();
            });
        });
    });

    // ---------------------------------------------------------
    // We tested all functions needed to initalize a repo so far
    var getRepoState = repofs.RepoUtils.initialize(driver);

    describe('.fetchBlob', function() {
        it('should fetch a blob obviously', function () {
            return getRepoState
            .then(function fetchBlob(repoState) {
                var workingState = repoState.getCurrentState();
                var readme = workingState.getTreeEntries().get('README.md');
                var sha = readme.getSha();
                return driver.fetchBlob(sha);
            })
            .then(function (blob) {
                blob.getByteLength().should.eql(0);
                blob.getAsString().should.eql('');
            });
        });
    });

    describe('.flushCommit', function() {
        it('should flush a commit from a CommitBuilder', function () {
            return getRepoState
            .then(function (repoState) {
                // Create a file for test
                repoState = repofs.FileUtils.create(
                    repoState, 'flushCommitFile', 'flushCommitContent');
                var commitBuilder = repofs.CommitUtils.prepare(repoState, {
                    author: 'Shakespeare',
                    message: 'Test message'
                });

                driver.flushCommit(commitBuilder)
                .then(function (commit) {
                    commit.getMessage().should.eql('Test message');
                    commit.getSha().should.be.ok();
                    var parents = new immutable.List([repoState.getCurrentBranch().getSha()]);
                    immutable.is(commit.getParents(), parents).should.be.true();
                });
            });
        });
    });
}

module.exports = testDriver;
