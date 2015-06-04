var Q = require('q');
var path = require('path');

var repofs = require('../');
var GitHubLocal = require('../lib/drivers/github');

describe('GitHub Driver', function() {
    var fs = repofs(GitHubLocal, {
        repository: 'GitbookIO/gitbook'
    });

    describe('fs.read', function() {
        it('should correctly read from master', function() {
            return fs.read('README.md').should.be.fulfilled;
        });

        it('should fail for non-existant file', function() {
            return fs.read('error-repofs.js').should.be.rejected;
        });
    });
});

