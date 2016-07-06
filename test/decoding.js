require('should');
var Immutable = require('immutable');
var _ = require('lodash');

var repofs = require('../');

var Blob = require('../lib/models/blob');
var Change = require('../lib/models/change');
var TreeEntry = require('../lib/models/treeEntry');
var Branch = require('../lib/models/branch');
var WorkingState = require('../lib/models/workingState');
var RepositoryState = require('../lib/models/repositoryState');

describe('Decoding, encoding', function() {

    var blob = Blob.createFromString('Test');

    var change = new Change({
        type: repofs.CHANGE.UPDATE,
        content: Blob.createFromString('ChangeBuffer'),
        sha:'changeSha'
    });

    var branch = new Branch({
        name: 'branchShortName',
        sha: 'branchSha',
        remote: 'branchRemote'
    });

    var treeEntry = new TreeEntry({
        blobSize: 10,
        sha: 'treeEntrySha',
        mode: '100644'
    });

    var workingState = new WorkingState({
        head: 'headSha',
        treeEntries: new Immutable.Map({
            'README.md': treeEntry
        }),
        changes: new Immutable.OrderedMap({
            'README.md': change
        })
    });

    var repositoryState = new RepositoryState({
        currentBranchName: branch.getName(),
        workingStates: new Immutable.Map().set(branch.getName(), workingState),
        branches: new Immutable.List().push(branch)
    });

    function testDecodeEncode(type, source) {
        return function () {
            var encdec = _.flow(type.encode, type.decode);
            var decenc = _.flow(type.decode, type.encode);

            Immutable.is(source, encdec(source)).should.be.true();

            var encoded = type.encode(source);
            encoded.should.eql(decenc(encoded));
        };
    }

    it('should encode and decode back a Blob', function () {
        var encoded = Blob.encode(blob);
        var decoded = Blob.decode(encoded);

        blob.getByteLength().should.eql(decoded.getByteLength());
        blob.getAsString().should.eql(decoded.getAsString());
    });

    it('should encode and decode back a Change', testDecodeEncode(Change, change));
    it('should encode and decode back a TreeEntry', testDecodeEncode(TreeEntry, treeEntry));
    it('should encode and decode back a Branch', testDecodeEncode(Branch, branch));
    it('should encode and decode back a WorkingState', testDecodeEncode(WorkingState, workingState));
    it('should encode and decode back a RepositoryState', testDecodeEncode(RepositoryState, repositoryState));

    it('should encode and decode an empty RepositoryState', testDecodeEncode(RepositoryState, RepositoryState.createEmpty()));
});

