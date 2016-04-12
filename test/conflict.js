require('should');

var immutable = require('immutable');

var repofs = require('../');

var ConflictUtils = require('../lib/utils/conflict');
var TreeEntry = require('../lib/models/treeEntry');

describe('ConflictUtils', function() {

    describe('._diffEntries', function() {

        it('should detect modified entries, added entries, and deleted entries', function() {
            function entry(sha) { return new TreeEntry({ sha: sha }); }

            var parentEntries = new immutable.Map({
                modified:  entry('modified1'),
                deleted: entry('deleted'),
                unchanged:  entry('unchanged')
            });

            var childEntries = new immutable.Map({
                modified:  entry('modified2'),
                added: entry('added'),
                unchanged:  entry('unchanged')
            });

            var expectedDiff = new immutable.Map({
                modified:  entry('modified2'),
                added: entry('added'),
                deleted: null
            });

            var result = ConflictUtils._diffEntries(parentEntries, childEntries);

            immutable.is(result, expectedDiff).should.be.true();
        });

    });

    describe('.getSolvedTree', function() {

        it('should merge back solved conflicts into a TreeConflict', function() {
            function entry(sha) { return new TreeEntry({ sha: sha }); }

            var parentEntries = new immutable.Map({
                modified:  entry('modified1'),
                deleted: entry('deleted'),
                unchanged:  entry('unchanged')
            });

            var childEntries = new immutable.Map({
                modified:  entry('modified2'),
                added: entry('added'),
                unchanged:  entry('unchanged')
            });

            var expectedDiff = new immutable.Map({
                modified:  entry('modified2'),
                added: entry('added'),
                deleted: null
            });

            var result = ConflictUtils._diffEntries(parentEntries, childEntries);

            immutable.is(result, expectedDiff).should.be.true();
        });

    });

});
