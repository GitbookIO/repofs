var repofs = require('../');

var Blob = require('../lib/models/blob');
var Change = require('../lib/models/change');
var ChangeUtils = repofs.ChangeUtils;

var mock = require('./mock');

describe('ChangeUtils', function() {
    var DEFAULT_BOOK = mock.DEFAULT_BOOK;

    var create = new Change({
        type: repofs.CHANGE.CREATE,
        content: Blob.createFromString('Create')
    });

    var remove = new Change({
        type: repofs.CHANGE.REMOVE
    });

    describe('.setChange', function() {

        it('should resolve REMOVE after a CREATE', function() {
            var state = DEFAULT_BOOK;

            state = ChangeUtils.setChange(DEFAULT_BOOK, 'new', create);
            ChangeUtils.getChange(state, 'new')
                .should.equal(create);

            state = ChangeUtils.setChange(DEFAULT_BOOK, 'new', remove);
            Boolean(ChangeUtils.getChange(state, 'new'))
                .should.equal(false);
        });

        it('should resolve CREATE after a REMOVE', function() {
            var state = DEFAULT_BOOK;

            state = ChangeUtils.setChange(DEFAULT_BOOK, 'README.md', remove);
            ChangeUtils.getChange(state, 'README.md')
                .should.equal(remove);

            state = ChangeUtils.setChange(DEFAULT_BOOK, 'README.md', create);
            ChangeUtils.getChange(state, 'README.md').getType()
                .should.equal(repofs.CHANGE.UPDATE);
        });
    });
});
