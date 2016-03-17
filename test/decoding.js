require('should');
var immutable = require('immutable');
var _ = require('lodash');

var repofs = require('../');

var Change = require('../lib/models/change');
var TreeEntry = require('../lib/models/treeEntry');
var Branch = require('../lib/models/branch');


describe('Decoding', function() {

    var change = new Change({
        type: repofs.CHANGE.UPDATE,
        content: new Buffer('ChangeBuffer'),
        sha:'changeSha',
        message: 'changeMessage'
    });

    var branch = new Branch({
        shortName: 'branchShortName',
        sha: 'branchSha',
        remote: 'branchRemote'
    });

    var treeEntry = new TreeEntry({
        size: 10,
        sha: 'treeEntrySha',
        mode: '100644'
    });

    function testDecodeEncode(type, source) {
        var encdec = _.flow(type.encode, type.decode);
        var degcenc = _.flow(type.decode, type.encode);

        immutable.is(source, encdec(source)).should.be.true();

        var encoded = type.encode(source);
        encoded.should.eql(decenc(encoded));
    }

    it('should encode and decode back a Change', testDecodeEncode(Change, change));
    it('should encode and decode back a TreeEntry', testDecodeEncode(TreeEntry, treeEntry));
    it('should encode and decode back a Branch', testDecodeEncode(Branch, branch));

    it('should decode a treeEntry', function() {
        var treeEntry = decodeTreeEntry(encodedTreeEntry);
        treeEntry.getSHA().should.equal('...');
    });

    it('should decode existing empty working state', function() {
        var emptyWorking = repofs.decodeWorkingState({ });
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

