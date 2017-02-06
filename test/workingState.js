require('should');

const repofs = require('../src/');
const mock = require('./mock');

describe('WorkingState', () => {

    describe('.isClean', () => {

        it('should true if workingState has not changes', () => {
            const repoState = mock.DEFAULT_BOOK;
            repoState.getCurrentState().isClean().should.equal(true);
        });

        it('should false if workingState has changes', () => {
            let repoState = mock.DEFAULT_BOOK;
            repoState = repofs.FileUtils.write(repoState, 'README.md', 'New content');
            repoState.getCurrentState().isClean().should.equal(false);
        });
    });
});

