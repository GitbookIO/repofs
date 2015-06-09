var Q = require('q');
var path = require('path');
var _ = require('lodash');

var patch = require('../lib/utils/patch');

describe('Patch', function() {

    it('should have correct generate a patch', function() {
        patch.compare('A', 'AB').should.equal('@@ -1 +1,2 @@\n A\n+B\n');
    });

});

