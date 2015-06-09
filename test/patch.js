var Q = require('q');
var path = require('path');
var _ = require('lodash');

var patch = require('../lib/utils/patch');

describe('Patch', function() {

    it('should have correct generate a patch', function() {
        patch.compare('A', 'AB').should.equal('@@ -1 +1,2 @@\n-A\n+AB\n');
    });

    it('should have correct generate a patch (multiple lines)', function() {
        patch.compare('A\nB\nC', 'A\nB\nD\nC').should.equal('@@ -1,5 +1,7 @@\n A%0AB%0A\n+D%0A\n C\n');
    });

    it('should correctly parse a patch', function() {
        var r = patch.parse(patch.compare('A', 'AB'));
        r.additions.should.equal(1);
        r.deletions.should.equal(1);
    });

});

