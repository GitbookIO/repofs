var Q = require('q');
var path = require('path');

var repofs = require('../');
var DriverLocal = require('../lib/drivers/local');

describe('Local Driver', function() {
    var fs = repofs(DriverLocal, {
        root: path.resolve(__dirname, './fixtures')
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
            return fs.read('README.md').should.eventually.equal('# Hello');
        });

        it('should fail for file out of the repo', function() {
            return fs.read('../../local.js').should.be.rejected;
        });
    });
});

