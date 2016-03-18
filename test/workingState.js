require('should');

var repofs = require('../');
var mock = require('./mock');

describe('WorkingState', function() {

    describe('.isClean', function() {

        it('should true if workingState has not changes', function() {
            var repoState = mock.DEFAULT_BOOK;
            repoState.getCurrentState().isClean().should.equal(true);
        });

        it('should false if workingState has changes', function() {
            var repoState = mock.DEFAULT_BOOK;
            repoState = repofs.FileUtils.write(repoState, 'README.md', 'New content');
            repoState.getCurrentState().isClean().should.equal(false);
        });

    });

});

