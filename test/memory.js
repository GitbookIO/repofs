var Q = require('q');
var path = require('path');
var _ = require('lodash');

var repofs = require('../');
var DriverMemory = require('../lib/drivers/memory');

describe('Memory Driver', function() {
    var commit;
    var fs = repofs(DriverMemory, {
        committer: {
            name: "John Doe",
            email: "johndoe@gmail.com"
        },
        files: {
            'README.md': "Hello world"
        }
    });

    it('should have correct type "memory"', function() {
        fs.type.should.equal('memory');
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
            return fs.read('README.md').should.eventually.equal("Hello world");
        });

        it('should fail for file out of the repo', function() {
            return fs.read('../../local.js').should.be.rejected;
        });
    });

    describe('fs.write', function() {
        it('should correctly write existing file', function() {
            return fs.write('README.md', 'test')
            .then(function() {
                return fs.read('README.md').should.eventually.equal("test");
            });
        });
    });

    describe('fs.create', function() {
        it('should correctly create a file', function() {
            return fs.create('lib/main.js', 'test 2')
            .then(function(fp) {
                fp.content.should.equal('test 2');
            });
        });

        it('should correctly create a file inside a folder', function() {
            return fs.create('lib/test/main.js', 'test 2');
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
            return fs.readdir('lib')
            .then(function(files) {
                files.should.not.have.property('README.md');
                files.should.have.property('main.js');
                files.should.have.property('test');
                files.test.isDirectory.should.equal(true);
                (_.size(files) > 0).should.equal(true);
            });
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
        it('should correctly add the branch', function() {
            return fs.createBranch("dev", "master")
            .then(function(branch) {
                branch.name.should.equal("dev");

                return fs.listBranches();
            })
            .then(function(branches) {
                _.find(branches, { name: "dev"}).should.have.property('commit');
            });
        });
    });

    describe('fs.removeBranch', function() {
        it('should correctly remove the branch', function() {
            return fs.removeBranch("dev")
            .then(function() {
                return fs.listBranches();
            })
            .then(function(branches) {
                if (_.find(branches, { name: "dev"})) throw "error";
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

});

