require('should');

var repofs = require('../');
var mock = require('./mock');

describe('FileUtils', function() {

    describe('.exists', function() {

        it('should true if file exists', function() {
            var repoState = mock.defaultBook();
            repofs.FileUtils.exists(repoState, 'README.md').should.equal(true);
            repofs.FileUtils.exists(repoState, 'SUMMARY.md').should.equal(true);
        });

        it('should false if file does not exists', function() {
            var repoState = mock.defaultBook();
            repofs.FileUtils.exists(repoState, 'Notexist.md').should.equal(false);
            repofs.FileUtils.exists(repoState, 'dir/SUMMARY.md').should.equal(false);
        });

    });
});
