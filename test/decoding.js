require('should');

var repofs = require('../');
var decodeChange = require('../lib/decoding/change');
var decodeTreeEntry = require('../lib/decoding/treeEntry');

describe('Decoding', function() {

    var encodedChange = {
        type: repofs.CHANGE.UPDATE
    };

    var encodedTreeEntry = {
        size: 10,
        sha: '...',
        mode: '100644'
    };

    it('should decode a change', function() {
        var change = decodeChange(encodedChange);
        change.getType().should.equal(repofs.CHANGE.UPDATE);
    });

    it('should decode a treeEntry', function() {
        var treeEntry = decodeTreeEntry(encodedTreeEntry);
        treeEntry.getSHA().should.equal('...');
    });

    it('should decode existing empty working state', function() {
    });

    it('should decode existing working state', function() {

        var workingState = repofs.decodeWorkingState({
            tree: {
                'README.md': encodedTreeEntry
            },
            changes: {
                'README.md': encodedChange
            }
        });
        workingState.isClean().should.equal(false);
        workingState.getChange('README.md').getType().should.equal(repofs.CHANGE.UPDATE);
        workingState.getTreeEntries().get('README.md').should.be.ok();
    });

    it('should encode and decode itself', function () {
    });
});

