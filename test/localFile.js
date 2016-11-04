
var should = require('should');

var fs = require('fs');
var path = require('path');
var Immutable = require('immutable');
var LocalFile = require('../lib/models/localFile');
var RepositoryState = require('../lib/models/repositoryState');

var repofs = require('../');
var LocalFileUtils = repofs.LocalFileUtils;

var GitHubDriver = repofs.GitHubDriver;

var REPO_DIR = '.tmp/repo/';
var REPO = process.env.REPOFS_REPO;
var HOST = process.env.REPOFS_HOST;

if (process.env.REPOFS_TOKEN) return;

describe('LocalFileUtils', function() {
    var driver = new GitHubDriver({
        repository: REPO,
        host: HOST
    });

    describe('.status', function() {
        before(function () {
            this.initialReadme = fs.readFileSync(path.join(REPO_DIR, 'README.md'), 'utf8');
            fs.writeFileSync(path.join(REPO_DIR, 'README.md'), 'New content');
            fs.writeFileSync(path.join(REPO_DIR, 'readme2.md'), 'New content');
        });

        after(function () {
            fs.writeFileSync(path.join(REPO_DIR, 'README.md'), this.initialReadme);
            fs.unlinkSync(path.join(REPO_DIR, 'readme2.md'));
        });

        it('should return list of changed files', function(done) {
            var repoState = new RepositoryState({
                currentBranchName: 'master'
            });

            LocalFileUtils.status(repoState, driver)
                .then(function (localFiles) {
                    // is an immutable list
                    localFiles.should.be.instanceof(Immutable.List);

                    // size equals 2
                    localFiles.size.should.be.equal(2);

                    // instance of file are LocalFile
                    localFiles.get(0).should.be.instanceof(LocalFile);
                    localFiles.get(1).should.be.instanceof(LocalFile);

                    // Content should be consistant
                    localFiles.get(1).should.eql(LocalFile.create({
                        sha: '0000000000000000000000000000000000000000',
                        filename: 'readme2.md',
                        status: 'untracked',
                        additions: 0,
                        deletions: 0,
                        changes: 0,
                        patch: ''
                    }));

                    localFiles.get(0).get('filename').should.equal('README.md');
                    localFiles.get(0).get('status').should.equal('modified');
                    localFiles.get(0).get('additions').should.equal(1);
                    localFiles.get(0).get('deletions').should.equal(1);
                    localFiles.get(0).get('changes').should.equal(2);
                    localFiles.get(0).get('patch').should.equal('@@ -1 +1 @@\n-# \\n\n+New content\n\\ No newline at end of file\n');
                })
                .then(done)
                .catch(done);
        });
    });
});
