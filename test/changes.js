const repofs = require('../src/');

const Blob = require('../src/models/blob');
const Change = require('../src/models/change');
const ChangeUtils = repofs.ChangeUtils;

const mock = require('./mock');

describe('ChangeUtils', () => {
    const DEFAULT_BOOK = mock.DEFAULT_BOOK;

    const create = new Change({
        type: repofs.CHANGE.CREATE,
        content: Blob.createFromString('Create')
    });

    const remove = new Change({
        type: repofs.CHANGE.REMOVE
    });

    describe('.setChange', () => {

        it('should resolve REMOVE after a CREATE', () => {
            let state = DEFAULT_BOOK;

            state = ChangeUtils.setChange(DEFAULT_BOOK, 'new', create);
            ChangeUtils.getChange(state, 'new')
                .should.equal(create);

            state = ChangeUtils.setChange(DEFAULT_BOOK, 'new', remove);
            Boolean(ChangeUtils.getChange(state, 'new'))
                .should.equal(false);
        });

        it('should resolve CREATE after a REMOVE', () => {
            let state = DEFAULT_BOOK;

            state = ChangeUtils.setChange(DEFAULT_BOOK, 'README.md', remove);
            ChangeUtils.getChange(state, 'README.md')
                .should.equal(remove);

            state = ChangeUtils.setChange(DEFAULT_BOOK, 'README.md', create);
            ChangeUtils.getChange(state, 'README.md').getType()
                .should.equal(repofs.CHANGE.UPDATE);
        });
    });
});
