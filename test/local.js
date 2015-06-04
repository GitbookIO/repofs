var Q = require('q');
var path = require('path');

var repofs = require('../');
var DriverLocal = require('../lib/drivers/local');

describe('Local Driver', function() {
    var fs = repofs(DriverLocal, {
        root: path.resolve(__dirname, './fixtures')
    });

    describe('fs.read', function() {
        it('should correctly read from master', function() {
            return fs.read('README.md');
        });

        it('should fail for file out of the repo', function() {
            return fs.read('../../local.js')
            .then(function() {
                throw "Should have failed";
            }, function() {
                return Q();
            });
        });
    });
});

