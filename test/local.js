var Q = require('q');
var path = require('path');
var _ = require('lodash');
var exec = require('child_process').exec;

var repofs = require('../');
var Gittle = require('gittle');
var DriverLocal = require('../lib/drivers/local');

describe('Local Driver', function() {
    var commit, fs;

    before(function() {
        var repoRoot = path.resolve(__dirname, './_local');

        return Q.nfcall(exec, 'rm -rf _local && git init _local && cd _local && touch README.md && git add README.md && git commit -m "Initial commit"', { cwd: __dirname })
        .then(function() {
            fs = repofs(DriverLocal, {
                repo: new Gittle(repoRoot),
                commiter: {
                    name: "John Doe",
                    email: "johndoe@gmail.com"
                }
            });
        });
    });

    it('should have correct type "local"', function() {
        fs.type.should.equal('local');
    });

    describe('fs.stat', function() {
        it('should correctly return info for a file', function() {
            return fs.stat('README.md')
            .then(function(file) {
                file.type.should.equal('file');
                file.name.should.equal('README.md');
                file.path.should.equal('README.md');
                file.content.should.equal('');
            });
        });
    });

    describe('fs.create', function() {
        it('should correctly create a file', function() {
            return fs.create('README.md', 'Hello')
            .then(function(fp) {
                fp.content.should.equal('Hello');
            });
        });

        it('should correctly create a file in a subdirectory', function() {
            return fs.create('lib/main.js', 'Hello 2')
            .then(function(fp) {
                fp.content.should.equal('Hello 2');
            });
        });
    });

    describe('fs.read', function() {
        it('should correctly read from master', function() {
            return fs.read('README.md').should.eventually.equal('Hello');
        });

        it('should fail for file out of the repo', function() {
            return fs.read('../../local.js').should.be.rejected;
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

        it('should correctly read a sub-directory', function() {
            return fs.readdir('./lib')
            .then(function(files) {
                files.should.not.have.property('README.md');
                (_.size(files) > 0).should.equal(true);
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
        it('should fail to write non existant file', function() {
            return fs.write('README_nonexistant.md', 'test').should.be.rejected;
        });

        it('should fail to write in a non existant branch', function() {
            return fs.write('README.md', 'test', { ref: "invalid" }).should.be.rejected;
        });
    });

    describe('fs.listBranches', function() {
        it('should correctly return branches', function() {
            return fs.listBranches()
            .then(function(branches) {
                _.find(branches, { name: "master"}).should.have.property('commit');
            });
        });
    });

    describe('fs.createBranch', function() {
        it('should correctly create a branch', function() {
            return fs.createBranch("dev");
        });

        it('should correctly write to a new branch', function() {
            return fs.create('README.md', 'Hello 2', { ref: "dev" })
            .then(function(fp) {
                fp.content.should.equal('Hello 2');
            });
        });
    });

    describe('fs.removeBranch', function() {
        it('should correctly remove a branch', function() {
            return fs.removeBranch("dev");
        });
    });

    describe('fs.listCommits', function() {
        it('should correctly list from master', function() {
            return fs.listCommits()
            .then(function(commits) {
                commits.length.should.be.gt(1);
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

});

