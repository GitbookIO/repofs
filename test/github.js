var Q = require('q');
var _ = require('lodash');
var path = require('path');

var repofs = require('../');

describe('GitHub Driver', function() {
    var commit;
    var fs = repofs({
        repository: 'GitbookIO/gitbook',
        committer: {
            name: "John Doe",
            email: "johndoe@gmail.com"
        }
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
            return fs.read('README.md').should.be.fulfilled;
        });

        it('should fail for non-existant file', function() {
            return fs.read('error-repofs.js').should.be.rejected;
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
    });

    describe('fs.listBranches', function() {
        it('should correctly return branches', function() {
            return fs.listBranches()
            .then(function(branches) {
                _.find(branches, { name: "master"}).should.have.property('commit');
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

    describe('fs.compareCommits', function() {
        it('should correctly compare two commits', function() {
            return fs.compareCommits('cefd8fc50f1285ab4be2bd869503282b2a9fa5ae', 'a972b327694b8facd2295cdca17886a6da27c2cb')
            .then(function(result) {
                result.status.should.equal('ahead');
                result.total_commits.should.equal(6);
            });
        });
    });

});

