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
        var driverBranch;

        before(function () {
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
            var createdCommit;

            it('should flush a commit from a CommitBuilder', function () {
                // Create a file for test
                repoState = repofs.FileUtils.create(
                    repoState, 'flushCommitFile', 'flushCommitContent');
                var commitBuilder = repofs.CommitUtils.prepare(repoState, {
                    author: new repofs.Author.create('Shakespeare', 'shakespeare@hotmail.com'),
                    message: 'Test message'
                });

                return driver.flushCommit(commitBuilder)
                .then(function (commit) {
                    createdCommit = commit;
                    createdCommit.getAuthor().getName().should.eql('Shakespeare');
                    createdCommit.getAuthor().getEmail().should.eql('shakespeare@hotmail.com');
                    createdCommit.getMessage().should.eql('Test message');
                    createdCommit.getSha().should.be.ok();
                    var parents = new immutable.List([repoState.getCurrentBranch().getSha()]);
                    immutable.is(createdCommit.getParents(), parents).should.be.true();
                });
            });

            describe('.forwardBranch', function() {
                it('should update a branch reference to a given commit', function () {
                    return driver.forwardBranch(driverBranch, createdCommit.getSha())
                    .then(function () {
                        // Ref flushed
                        return repofs.RepoUtils.fetchBranches(repoState, driver);
                    })
                    .then(function (repoState) {
                        repoState.getCurrentBranch().getSha().should.eql(createdCommit.getSha());
                    });
                });
            });

            describe('.listCommits', function() {
                it('should list commits on a branch', function () {
                    return driver.listCommits({
                        ref: driverBranch.getFullName()
                    })
                    .then(function (commits) {
                        commits.count().should.eql(2);
                        // Initial commit, should not have
                        commits.last().getParents().isEmpty().should.be.true();
                        // Most recent commit
                        immutable.is(commits.first(), createdCommit);
                    });
                });

                it('should list commits on a branch, filtering by modified file', function () {
                    return driver.listCommits({
                        ref: driverBranch.getFullName(),
                        path: 'flushCommitFile'
                    })
                    .then(function (commits) {
                        commits.count().should.eql(1);
                        // Only created commit
                        immutable.is(commits.first(), createdCommit);
                    });
                });

                it('should list commits on a branch, filtering by author', function () {
                    return driver.listCommits({
                        ref: driverBranch.getFullName(),
                        author: 'shakespeare@hotmail.com'
                    })
                    .then(function (commits) {
                        commits.count().should.eql(1);
                        // Only created commit
                        immutable.is(commits.first(), createdCommit);
                    });
                });
            });

            describe('.fetchCommit', function() {
                it('should fetch a commit, complete with files', function () {
                    return driver.fetchCommit(createdCommit.getSha())
                    .then(function (commit) {
                        commit.getAuthor().getName().should.eql('Shakespeare');
                        commit.getAuthor().getEmail().should.eql('shakespeare@hotmail.com');
                        commit.getMessage().should.eql('Test message');
                        // Only one file modified
                        commit.getFiles().count().should.eql(1);
                        var file = commit.getFiles().first();
                        file.sha.should.eql('9c8e3f259e7e5f52ad5df962b899676ccde2e008');
                        file.filename.should.eql('flushCommitFile');
                        file.status.should.eql('added');
                        file.additions.should.eql(1);
                        file.deletions.should.eql(0);
                        file.changes.should.eql(1);
                        file.patch.should.be.ok();
                    });
                });
            });
        });

        // Better do this one last...
        describe('.deleteBranch', function() {
            it('should remove a branch', function() {
                return driver.deleteBranch(driverBranch)
                .then(function () {
                    return driver.fetchBranches();
                })
                .then(function (branches) {
                    branches.some(function (br) {
                        return br.getFullName() === driverBranch.getFullName();
                    }).should.be.false();
                });
            });
        });
    });
}
