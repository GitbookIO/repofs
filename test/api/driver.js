var immutable = require('immutable');
var Q = require('q');
var repofs = require('../../');

module.exports = function (driver) {
    return describe('Driver', testDriver.bind(this, driver));
};

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
                return driver.createBranch(master, 'driver-test')
                .then(function (branch) {
                    return Q.all([
                        branch,
                        findBranch(driver, 'driver-test')
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
    describe('... we can now init a repo', function() {

        var repoState;

        before(function () {
            var driverBranch;
            return repofs.RepoUtils.initialize(driver)
            .then(function (newState) {
                driverBranch = newState.getBranch('driver-test');
                return repofs.RepoUtils.fetchTree(newState, driver, driverBranch);
            })
            .then(function (newState) {
                repoState = repofs.RepoUtils.checkout(newState, driverBranch);
            });
        });

        describe('.fetchBlob', function() {
            it('should fetch a blob obviously', function () {
                var workingState = repoState.getCurrentState();
                var readme = workingState.getTreeEntries().get('README.md');
                var sha = readme.getSha();
                return driver.fetchBlob(sha)
                .then(function (blob) {
                    blob.should.be.ok();
                });
            });
        });

        describe('.flushCommit', function() {
            var commit;

            it('should flush a commit from a CommitBuilder', function () {
                // Create a file for test
                repoState = repofs.FileUtils.create(
                    repoState, 'flushCommitFile', 'flushCommitContent');
                var commitBuilder = repofs.CommitUtils.prepare(repoState, {
                    author: new repofs.Author.create('Shakespeare', 'shakespeare@hotmail.com'),
                    message: 'Test message'
                });

                return driver.flushCommit(commitBuilder)
                .then(function (createdCommit) {
                    commit = createdCommit;
                    commit.getAuthor().getName().should.eql('Shakespeare');
                    commit.getAuthor().getEmail().should.eql('shakespeare@hotmail.com');
                    commit.getMessage().should.eql('Test message');
                    commit.getSha().should.be.ok();
                    var parents = new immutable.List([repoState.getCurrentBranch().getSha()]);
                    immutable.is(commit.getParents(), parents).should.be.true();
                });
            });

            describe('.forwardBranch', function() {
                it('should update a branch reference to a given commit', function () {
                    var driverBranch = repoState.getCurrentBranch();
                    return driver.forwardBranch(driverBranch, commit.getSha())
                    .then(function () {
                        // Ref flushed
                        return repofs.RepoUtils.fetchBranches(repoState, driver);
                    })
                    .then(function (repoState) {
                        repoState.getCurrentBranch().getSha().should.eql(commit.getSha());
                    });
                });
            });

        });
    });
}
