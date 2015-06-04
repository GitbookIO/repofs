var Q = require('q');
var path = require('path');
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
chai.should();

var repofs = require('../');
var DriverLocal = require('../lib/drivers/local');

describe('Local Driver', function() {
    var fs = repofs(DriverLocal, {
        root: path.resolve(__dirname, './fixtures')
    });

    describe('fs.read', function() {
        it('should correctly read from master', function() {
            return fs.read('README.md').should.eventually.equal('# Hello')
        });

        it('should fail for file out of the repo', function() {
            return fs.read('../../local.js').should.be.rejected;
        });
    });
});

