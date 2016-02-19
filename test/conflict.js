var _ = require('lodash');
var conflicter = require('../lib/conflicter');

describe('Conflict module', function() {

    it('should detect unchanged files between two trees', function() {
        var baseTreeEntries = [{
            'path': 'unchangedfile',
            'sha': 'unchanged'
        }];
        var headTreeEntries = [{
            'path': 'unchangedfile',
            'sha': 'unchanged'
        }];
        var conflicts = conflicter.listConflicts(baseTreeEntries, headTreeEntries, { stripe: false });
        conflicts.should.eql({
            unchangedfile: {
                base: 'unchanged',
                head: 'unchanged',
                path: 'unchangedfile',
                status: conflicter.FILE.UNCHANGED
            }
        });
    });

    it('should detect conflicts between two trees', function() {
        var shaUnchanged = 'shaUnchanged';
        var shaMoved = 'shaMoved';
        var shaModified1 = 'shaModified1';
        var shaModified2 = 'shaModified2';
        var shaDeletedInHead = 'shaDeletedInHead';
        var shaDeletedInBase = 'shaDeletedInBase';

        var baseTreeEntries = [
            {
                'path': 'unchanged',
                'sha': shaUnchanged
            },
            {
                'path': 'moved1',
                'sha': shaMoved
            },
            {
                'path': 'modified',
                'sha': shaModified1
            },
            {
                'path': 'deletedInHead',
                'sha': shaDeletedInHead
            }];
        var headTreeEntries = [
            {
                'path': 'unchanged',
                'sha': shaUnchanged
            },
            {
                'path': 'moved2',
                'sha': shaMoved
            },
            {
                'path': 'modified',
                'sha': shaModified2
            },
            {
                'path': 'deletedInBase',
                'sha': shaDeletedInBase
            }];

        var conflicts = conflicter.listConflicts(baseTreeEntries, headTreeEntries);

        conflicts.should.eql({
            moved1:
            { base: 'shaMoved',
              path: 'moved1',
              status: conflicter.FILE.ABSENT_FROM_HEAD,
              head: null },
            modified:
            { base: 'shaModified1',
              head: 'shaModified2',
              path: 'modified',
              status: conflicter.FILE.BOTH_MODIFIED },
            deletedInHead:
            { base: 'shaDeletedInHead',
              path: 'deletedInHead',
              status: conflicter.FILE.ABSENT_FROM_HEAD,
              head: null },
            moved2:
            { head: 'shaMoved',
              path: 'moved2',
              status: conflicter.FILE.ABSENT_FROM_BASE,
              base: null },
            deletedInBase:
            { head: 'shaDeletedInBase',
              path: 'deletedInBase',
              status: conflicter.FILE.ABSENT_FROM_BASE,
              base: null }
        });
    });


    var commonEntries = {
        'README.md': {
            sha: '1b4745c9835c8bdcbd13ead3e4616bc3a0732654',
            path: 'README.md',
            size: 18,
            mode: '100644',
            type: 'blob' },
        'branchdir/appendfile': {
            sha: '361f791b9d1f30454e0300396263b5b333421b54',
            path: 'branchdir/appendfile',
            size: 32,
            mode: '100644',
            type: 'blob' },
        'branchdir/masterfile': {
            sha: 'ddec47848bef05951643e8da96d4aab79f09c0dd',
            path: 'branchdir/masterfile',
            size: 23,
            mode: '100644',
            type: 'blob' }
    };

    var baseTree = {
        sha: '3bb128bc135266ace5d817d45c1dfd057fe1ee21',
        entries: _.extend({}, commonEntries, {
            'branchdir/conflictfile': {
                sha: 'ecf9936de81913a4b292d1adf46a3e2e9b6bae95',
                path: 'branchdir/conflictfile',
                size: 36,
                mode: '100644',
                type: 'blob'
            }
        })
    };

    /* var headTree = {
        sha: 'b4f5c3ce6f4bb532fd65ebbbf7d8a4951439f7f8',
        entries: _.extend({}, commonEntries, {
            'branchdir/conflictfile': {
                sha: '05dd87fed0042c852a51afc389c9a341c5a0b4a2',
                path: 'branchdir/conflictfile',
                size: 36,
                mode: '100644',
                type: 'blob' }
        })
    }; */

    it('should leave a tree unchanged with empty solved conflicts', function() {
        conflicter.mergeInTree({
            message: 'Nothing solved',
            conflicts: {}
        }, baseTree).should.eql(baseTree);
    });

    it('should merge solved conflicts into a tree', function() {
        var mergedTree = conflicter.mergeInTree({
            message: 'This is solved',
            conflicts: {
                'branchdir/conflictfile': {
                    path: 'branchdir/conflictfile',
                    buffer: 'Cool merged buffer' // size 18
                }
            }
        }, baseTree);
        mergedTree.should.not.eql(baseTree);
        mergedTree.entries['branchdir/conflictfile'].should.be.eql({
            path: 'branchdir/conflictfile',
            buffer: 'Q29vbCBtZXJnZWQgYnVmZmVy',
            size: 18
        });
    });
});
