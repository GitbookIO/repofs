var Q = require('q');
var _ = require('lodash');

var Octocat = require('octocat');
var repofs = require('../');
var conflicter = require('../lib/conflicter');

var GH_REPO = process.env.GITHUB_REPO;
var GH_TOKEN = process.env.GITHUB_TOKEN;

if (!GH_TOKEN || !GH_REPO) throw new Error('Testing require github configuration');

var client = new Octocat({
    token: GH_TOKEN
});

describe('GitHub Driver', function() {
    var commit;
    var fs = repofs({
        repository: GH_REPO,
        token: GH_TOKEN,
        committer: {
            name: 'John Doe',
            email: 'johndoe@gmail.com'
        }
    });

    // Setup base repo
    before(function() {
        var repo = client.repo(GH_REPO);

        return repo.destroy()
        .fail(function(err) {
            return Q();
        })
        .then(function() {
            return client.createRepo({
                name: _.last(GH_REPO.split('/')),
                auto_init: true
            });
        });
    });

    // Destroy repository after tests
    after(function() {
        var repo = client.repo(GH_REPO);
        return repo.destroy();
    });

    it('should have correct type "github"', function() {
        fs.type.should.equal('github');
    });

    describe('fs.checkout', function() {
        it('should correctly change branch', function() {
            return fs.checkout('master');
        });
    });

    describe('fs.stat', function() {
        it('should correctly return info for a file', function() {
            return fs.stat('README.md')
            .then(function(file) {
                file.type.should.equal('file');
                file.name.should.equal('README.md');
                file.path.should.equal('README.md');
            });
        });
    });

    describe('fs.read', function() {
        it('should correctly read from master', function() {
            return fs.read('README.md').should.be.fulfilled();
        });

        it('should fail for non-existant file', function() {
            return fs.read('error-repofs.js').should.be.rejected();
        });
    });

    describe('fs.readdir', function() {
        it('should correctly read the root directory', function() {
            return fs.readdir()
            .then(function(files) {
                files.should.have.property('README.md');

                files['README.md'].type.should.equal('file');
                files['README.md'].name.should.equal('README.md');
                files['README.md'].path.should.equal('README.md');
            });
        });
    });

    describe('fs.exists', function() {
        it('should return true if file exists', function() {
            return fs.exists('README.md').should.eventually.equal(true);
        });
        it('should return false if file is not existing', function() {
            return fs.exists('README_test.md').should.eventually.equal(false);
        });
    });

    describe('fs.write', function() {
        it('should fail to write non-existing file', function() {
            return fs.write('README_nonexistant.md', 'test').should.be.rejected();
        });
    });

    describe('fs.create', function() {
        it('should fail to create existing file', function() {
            return fs.create('README.md', 'test').should.be.rejected();
        });
    });

    describe('fs.listBranches', function() {
        it('should correctly return branches', function() {
            return fs.listBranches()
            .then(function(branches) {
                _.find(branches, { name: 'master'}).should.have.property('commit');
            });
        });
    });

    describe('fs.listCommits', function() {
        it('should correctly list from master', function() {
            return fs.listCommits()
            .then(function(commits) {
                commit = _.first(commits);
            });
        });
    });

    describe('fs.getCommit', function() {
        it('should correctly get a commit', function() {
            return fs.getCommit(commit.sha)
            .then(function(_commit) {
                _commit.message.should.equal(commit.message);
            });
        });
    });

    describe('Changes', function() {
        it('should select a branch', function() {
            return fs.checkout('master');
        });

        it('should create a file', function() {
            return fs.create('TEST.md', 'test create').should.be.fulfilled();
        });

        it('should signal that file has been created', function() {
            var changes = fs.working.listChanges();
            changes.should.have.property('TEST.md');
            changes['TEST.md'].type.should.equal('create');
            changes.should.not.have.property('README.md');
        });

        it('should edit a file', function() {
            return fs.write('README.md', 'test edit').should.be.fulfilled();
        });

        it('should signal that file has been edited', function() {
            var changes = fs.working.listChanges();
            changes.should.have.property('TEST.md');
            changes.should.have.property('README.md');
            changes['README.md'].type.should.equal('update');
        });

        it('should correctly commit change', function() {
            return fs.commit({
                message: 'Test commit'
            }).should.be.fulfilled();
        });

        it('should have cleared changes', function() {
            var changes = fs.working.listChanges();
            _.size(changes).should.equal(0);
        });
    });

    describe('Handling branches', function() {
        var dir = 'branchdir/';
        var appendContent = 'Both will write without conflict';

        // Structure of the directory for merging tests
        // branchdir
        // ├── appendfile	Both modified without conflict
        // ├── branchfile	Created by branch only
        // ├── conflictfile	Both modified with conflict
        // └── masterfile	Created by master only

        before(function() {
            return fs.checkout('master')
                .then(function () {
                    return fs.update(dir + 'masterfile', 'Only master writes here');
                })
                .then(function () {
                    return fs.update(dir + 'appendfile', appendContent);
                })
                .then(function () {
                    return fs.update(dir + 'conflictfile', 'Both will write with conflict');
                })
                .then(function () {
                    return fs.commit({ message: 'Files setup'});
                })
                // TODO branch creations could be done in parallel
                .then(function () {
                    // Branch with conflicts
                    return fs.createBranch('conflict');
                })
                .then(function () {
                    // Branch without conflict
                    return fs.createBranch('no-conflict');
                })
                .then(function () {
                    return fs.update(dir + 'conflictfile', 'Both will write with MASTER conflict');
                })
                .then(function () {
                    return fs.commit({ message: 'Master makes conflict'});
                })
                .then(function () {
                    return fs.checkout('no-conflict');
                })
                .then(function () {
                    return fs.update(dir + 'branchfile', 'Only the branch is writing');
                })
                .then(function () {
                    return fs.update(dir + 'appendfile', appendContent
                                     + ' Branch safely append here');
                })
                .then(function () {
                    return fs.commit({ message: 'Creates branchfile. Appends to appendfile'});
                })
                .then(function () {
                    return fs.checkout('conflict');
                })
                .then(function () {
                    return fs.update(dir + 'conflictfile', 'Both will write with BRANCH conflict');
                })
                .then(function () {
                    return fs.commit({ message: 'Conflicting write to conflictfile'});
                })
                .then(function () {
                    return fs.checkout('master');
                });
        });

        it('should compare identical branches', function() {
            return fs._detectConflicts('master', 'master')
                .then(function (r) {
                    r.status.should.eql(conflicter.REFS.IDENTICAL);
                    r.base.should.eql('master');
                    r.head.should.eql('master');
                });
        });

        it('should compare diverging branches', function() {
            return fs._detectConflicts('master', 'conflict')
                .then(function (r) {
                    r.status.should.eql(conflicter.REFS.DIVERGED);
                    r.base.should.eql('master');
                    r.head.should.eql('conflict');
                    r.conflicts[dir + 'conflictfile'].should.eql({
                        base: 'ecf9936de81913a4b292d1adf46a3e2e9b6bae95',
                        head: '05dd87fed0042c852a51afc389c9a341c5a0b4a2',
                        path: dir + 'conflictfile',
                        status: conflicter.FILE.BOTH_MODIFIED
                    });
                });
        });

        it('should automatically merge non-conflicting branches', function() {
            return fs.createBranch('merge-no-conflict') // = master
                .then(function () {
                    return fs.checkout('merge-no-conflict');
                })
                .then(function() {
                    return fs.mergeBranches('no-conflict', 'merge-no-conflict');
                })
                .then(function() {
                    return fs.checkout('master');
                });
        });

        it('should raise a conflict event when merging conflicting branches', function() {
            fs.once('conflicts.resolve.needed', function(conflicts, next) {
                // Deleting everything is a good way of solving conflicts.
                // Thinking about making it the default... ;)
                next(null, {
                    message: "Cleaned up",
                    conflicts: {
                    }
                });
            });
            return fs.createBranch('merge-conflict-event') // = master
            .then(function () {
                return fs.checkout('merge-conflict-event');
            })
            .then(function () {
                return fs.mergeBranches('conflict', 'merge-conflict-event');
            })
            .then(function () {
                return fs.checkout('master');
            });
        });

        it.only('should solve conflicts when merging', function() {
            fs.once('conflicts.resolve.needed', function(conflicts, next) {
                console.log('MERGED FAILED');
                next(null, {
                    message: "Merge message",
                    conflicts: {
                        'branchdir/conflictfile': {
                            path: dir+'conflictfile',
                            buffer: 'Merged content' }
                    }
                });
            });
            return fs.createBranch('merge-conflict') // = master
            .then(function () {
                return fs.checkout('merge-conflict');
            })
            .then(function () {
                return fs.mergeBranches('conflict', 'merge-conflict');
            })
            .then(function () {
                return Q.all([
                    fs.read(dir+'conflictfile'),
                    fs.read(dir+'masterfile')
                ]);
            })
            .spread(function (conflictContent, masterContent) {
                masterContent.should.be.eql('Only master writes here');
                conflictContent.should.be.eql('Merged content');
            })
            .then(function () {
                return fs.checkout('master');
            });
        });

        it('should compare non conflicting-branches branches', function() {
            // TODO
        });

        it('should compare non fast-forwardable branches (behind)', function() {
            // TODO
        });

        it('should compare non fast-forwardable branches (ahead)', function() {
            // TODO
        });

        it('should compare conflicting-branches branches', function() {
            // TODO
        });
    });
});

