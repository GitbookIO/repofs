require('should');
var WorkingState = require('../lib/models/workingState');

describe('WorkingState', function() {

    describe('.isClean', function() {

        it('should true if workingState has not changes', function() {
            var workingState = WorkingState.createEmpty();
            workingState.isClean().should.equal(true);
        });

        it('should false if workingState has changes', function() {
            var workingState = WorkingState.createEmpty();



            workingState.isClean().should.equal(true);
        });

    });

});

