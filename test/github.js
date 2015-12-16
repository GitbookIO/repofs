var Q = require('q');
var _ = require('lodash');

var Octocat = require('octocat');
var repofs = require('../');

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
            return fs.write('README_nonexistant.md', 'test').should.be.rejected;
        });
    });

    describe('fs.create', function() {
        it('should fail to create existing file', function() {
            return fs.create('README.md', 'test').should.be.rejected;
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
            return fs.create('TEST.md', 'test create').should.be.fulfilled;
        });

        it('should signal that file has been created', function() {
            var changes = fs.listChanges();
            changes.should.have.property('TEST.md');
            changes['TEST.md'].type.should.equal('create');
            changes.should.not.have.property('README.md');
        });

        it('should edit a file', function() {
            return fs.write('README.md', 'test edit').should.be.fulfilled;
        });

        it('should signal that file has been edited', function() {
            var changes = fs.listChanges();
            changes.should.have.property('TEST.md');
            changes.should.have.property('README.md');
            changes['README.md'].type.should.equal('update');
        });

        it('should correctly commit change', function() {
            return fs.commit({
                message: 'Test commit'
            }).should.be.fulfilled;
        });
    });
});

