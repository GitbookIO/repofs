var Q = require('q');
var path = require('path');
var _ = require('lodash');

var repofs = require('../');
var DriverLocal = require('../lib/drivers/local');

describe('Local Driver', function() {
    var fs = repofs(DriverLocal, {
        root: path.resolve(__dirname, '../')
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
});

