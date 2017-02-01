require('should');
const Immutable = require('immutable');
const _ = require('lodash');

const repofs = require('../src/');

const Blob = require('../src/models/blob');
const Change = require('../src/models/change');
const TreeEntry = require('../src/models/treeEntry');
const Branch = require('../src/models/branch');
const WorkingState = require('../src/models/workingState');
const RepositoryState = require('../src/models/repositoryState');

describe('Decoding, encoding', () => {

    const blob = Blob.createFromString('Test');

    const change = new Change({
        type: repofs.CHANGE.UPDATE,
        content: Blob.createFromString('ChangeBuffer'),
        sha: 'changeSha'
    });

    const branch = new Branch({
        name: 'branchShortName',
        sha: 'branchSha',
        remote: 'branchRemote'
    });

    const treeEntry = new TreeEntry({
        blobSize: 10,
        sha: 'treeEntrySha',
        mode: '100644'
    });

    const workingState = new WorkingState({
        head: 'headSha',
        treeEntries: new Immutable.Map({
            'README.md': treeEntry
        }),
        changes: new Immutable.OrderedMap({
            'README.md': change
        })
    });

    const repositoryState = new RepositoryState({
        currentBranchName: branch.getName(),
        workingStates: new Immutable.Map().set(branch.getName(), workingState),
        branches: new Immutable.List().push(branch)
    });

    function testDecodeEncode(type, source) {
        return function() {
            const encdec = _.flow(type.encode, type.decode);
            const decenc = _.flow(type.decode, type.encode);

            Immutable.is(source, encdec(source)).should.be.true();

            const encoded = type.encode(source);
            encoded.should.eql(decenc(encoded));
        };
    }

    it('should encode and decode back a Blob', () => {
        const encoded = Blob.encode(blob);
        const decoded = Blob.decode(encoded);

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

