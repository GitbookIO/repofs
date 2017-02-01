const should = require('should');
const Immutable = require('immutable');
const Q = require('q');
const repofs = require('../../src/');
const fs = require('fs');

module.exports = function(driver) {
    return describe('Driver', testDriver.bind(this, driver));
};

const REPO_DIR = '.tmp/repo/';

// Tests a driver set on a repo initialized with empty README.md
function testDriver(driver) {

    function findBranch(driver, fullname) {
        return driver.fetchBranches()
        .then(function find(branches) {
            return branches.find((br) => {
                return br.getFullName() === fullname;
            });
        });
    }

    describe('.fetchBranches', () => {
        it('should list existing branches', () => {
            return driver.fetchBranches()
            .then((branches) => {
                (branches instanceof Immutable.List).should.be.true();
                branches.count().should.eql(1);
                const branch = branches.first();
                branch.getFullName().should.eql('master');
            });
        });
    });

    describe('.createBranch', () => {
        it('should clone a branch', () => {
            return findBranch(driver, 'master')
            .then((master) => {
                return driver.createBranch(master, 'driver-test')
                .then((branch) => {
                    return Q.all([
                        branch,
                        findBranch(driver, 'driver-test')
                    ]);
                })
                .spread((returned, fetched) => {
                    Immutable.is(returned, fetched).should.be.true();
                    fetched.getSha().should.eql(master.getSha());
                });
            });
        });
    });

    describe('.fetchWorkingState', () => {
        it('should fetch a WorkingState of a basic repo', () => {
            return Q.all([
                findBranch(driver, 'master'),
                driver.fetchWorkingState('master')
            ])
            .spread((master, workingState) => {
                workingState.getHead().should.eql(master.getSha());
                const readme = workingState.getTreeEntries().get('README.md');
                readme.should.be.ok();
                readme.getBlobSize().should.be.above(0);
                workingState.getChanges().isEmpty().should.be.true();
            });
        });
    });

    // ---------------------------------------------------------
    // We tested all functions needed to initalize a repo so far
    describe('... we can now init a repo', () => {

        let repoState;
        let driverBranch;

        before(() => {
            return repofs.RepoUtils.initialize(driver)
            .then((newState) => {
                driverBranch = newState.getBranch('driver-test');
                return repofs.RepoUtils.fetchTree(newState, driver, driverBranch);
            })
            .then((newState) => {
                repoState = repofs.RepoUtils.checkout(newState, driverBranch);
            });
        });

        describe('.fetchBlob', () => {
            it('should fetch a blob obviously', () => {
                const workingState = repoState.getCurrentState();
                const readme = workingState.getTreeEntries().get('README.md');
                const sha = readme.getSha();
                return driver.fetchBlob(sha)
                .then((blob) => {
                    blob.should.be.ok();
                });
            });
        });

        describe('.flushCommit', () => {
            let createdCommit;

            it('should flush a commit from a CommitBuilder', () => {
                // Create a file for test
                repoState = repofs.FileUtils.create(
                    repoState, 'flushCommitFile', 'flushCommitContent');
                const commitBuilder = repofs.CommitUtils.prepare(repoState, {
                    author: new repofs.Author.create('Shakespeare', 'shakespeare@hotmail.com'),
                    message: 'Test message'
                });

                return driver.flushCommit(commitBuilder)
                .then((commit) => {
                    createdCommit = commit;
                    createdCommit.getAuthor().getName().should.eql('Shakespeare');
                    createdCommit.getAuthor().getEmail().should.eql('shakespeare@hotmail.com');
                    createdCommit.getMessage().should.eql('Test message');
                    createdCommit.getSha().should.be.ok();
                    const parents = new Immutable.List([repoState.getCurrentBranch().getSha()]);
                    Immutable.is(createdCommit.getParents(), parents).should.be.true();
                });
            });

            describe('.forwardBranch', () => {
                it('should update a branch reference to a given commit', () => {
                    return driver.forwardBranch(driverBranch, createdCommit.getSha())
                    .then(() => {
                        // Ref flushed
                        return repofs.RepoUtils.fetchBranches(repoState, driver);
                    })
                    .then((repoState) => {
                        repoState.getCurrentBranch().getSha().should.eql(createdCommit.getSha());
                    });
                });
            });

            describe('.listCommits', () => {
                it('should list commits on a branch', () => {
                    return driver.listCommits({
                        ref: driverBranch.getFullName()
                    })
                    .then((commits) => {
                        commits.count().should.eql(2);
                        // Initial commit, should not have
                        commits.last().getParents().isEmpty().should.be.true();
                        // Most recent commit
                        Immutable.is(commits.first(), createdCommit);
                    });
                });

                it('should list commits on a branch, filtering by modified file', () => {
                    return driver.listCommits({
                        ref: driverBranch.getFullName(),
                        path: 'flushCommitFile'
                    })
                    .then((commits) => {
                        commits.count().should.eql(1);
                        // Only created commit
                        Immutable.is(commits.first(), createdCommit);
                    });
                });

                it('should list commits on a branch, filtering by author', () => {
                    return driver.listCommits({
                        ref: driverBranch.getFullName(),
                        author: 'shakespeare@hotmail.com'
                    })
                    .then((commits) => {
                        commits.count().should.eql(1);
                        // Only created commit
                        Immutable.is(commits.first(), createdCommit);
                    });
                });
            });

            describe('.fetchCommit', () => {
                it('should fetch a commit, complete with files', () => {
                    return driver.fetchCommit(createdCommit.getSha())
                    .then((commit) => {
                        commit.getAuthor().getName().should.eql('Shakespeare');
                        commit.getAuthor().getEmail().should.eql('shakespeare@hotmail.com');
                        commit.getMessage().should.eql('Test message');
                        // Only one file modified
                        commit.getFiles().count().should.eql(1);
                        const file = commit.getFiles().first();
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

        describe('.fetchWorkingState', () => {
            it('should not list directories as tree entries', () => {
                // Create a directory for test
                repoState = repofs.FileUtils.create(
                    repoState, 'dir/file', 'content'
                );

                const commitBuilder = repofs.CommitUtils.prepare(repoState, {
                    author: new repofs.Author.create('Shakespeare', 'shakespeare@hotmail.com'),
                    message: 'Test directories'
                });

                return driver.flushCommit(commitBuilder)
                // Not forwarding driverBranch, to avoid messing
                // up with the rest of the tests
                .then((commit) => {
                    return driver.fetchWorkingState(commit.getSha());
                })
                .then((workingState) => {
                    should(workingState.getTreeEntries().get('dir/file')).be.ok();
                    should(workingState.getTreeEntries().get('dir')).be.undefined();
                });
            });
        });

        describe('UHUB specific', () => {
            if (process.env.REPOFS_DRIVER !== 'uhub') return;

            describe('.editRemotes', () => {
                it('should add a remote', () => {
                    return driver.editRemotes('origin', 'url')
                    .then(() => {
                        return driver.listRemotes();
                    })
                    .then((remotes) => {
                        remotes.should.eql([
                            {
                                name: 'origin',
                                url: 'url'
                            }
                        ]);
                    });
                });
            });

            describe('.checkout', () => {
                it('should update filesystem to reflect a branch', () => {
                    fs.readdirSync(REPO_DIR).should.eql([
                        '.git',
                        'README.md'
                    ]);

                    return driver.checkout(driverBranch)
                    .then(function checkFilesystem() {
                        // Check that files are on the filesystem
                        fs.readdirSync(REPO_DIR).should.eql([
                            '.git',
                            'README.md',
                            'flushCommitFile'
                        ]);
                    });
                });
            });
        });

        // Better do this one last...
        describe('.deleteBranch', () => {
            it('should remove a branch', () => {
                return driver.deleteBranch(driverBranch)
                .then(() => {
                    return driver.fetchBranches();
                })
                .then((branches) => {
                    branches.some((br) => {
                        return br.getFullName() === driverBranch.getFullName();
                    }).should.be.false();
                });
            });
        });
    });
}
