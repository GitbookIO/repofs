var conflict = require('../lib/conflict');

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
        var conflicts = conflict.listConflicts(baseTreeEntries, headTreeEntries, { stripe: false });
        conflicts.should.eql({
            unchangedfile: {
                base: 'unchanged',
                head: 'unchanged',
                path: 'unchangedfile',
                status: conflict.FILE.UNCHANGED
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

        var conflicts = conflict.listConflicts(baseTreeEntries, headTreeEntries);

        conflicts.should.eql({
            moved1:
            { base: 'shaMoved',
              path: 'moved1',
              status: conflict.FILE.ABSENT_FROM_HEAD,
              head: null },
            modified:
            { base: 'shaModified1',
              head: 'shaModified2',
              path: 'modified',
              status: conflict.FILE.BOTH_MODIFIED },
            deletedInHead:
            { base: 'shaDeletedInHead',
              path: 'deletedInHead',
              status: conflict.FILE.ABSENT_FROM_HEAD,
              head: null },
            moved2:
            { head: 'shaMoved',
              path: 'moved2',
              status: conflict.FILE.ABSENT_FROM_BASE,
              base: null },
            deletedInBase:
            { head: 'shaDeletedInBase',
              path: 'deletedInBase',
              status: conflict.FILE.ABSENT_FROM_BASE,
              base: null }
        });
    });
});