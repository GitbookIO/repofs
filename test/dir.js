require('should');

const _ = require('lodash');

const repofs = require('../src/');
const DirUtils = repofs.DirUtils;
const FileUtils = repofs.FileUtils;
const mock = require('./mock');

describe('DirUtils', () => {

    const INITIAL_FILES = [
        'file.root',
        'dir/file1',
        'dir/file2',
        'dir.deep/file1',
        'dir.deep/dir/file1'
    ];

    const NESTED_DIRECTORY = mock.directoryStructure(INITIAL_FILES);

    describe('.read', () => {

        it('should list files from root', () => {
            const files = DirUtils.read(NESTED_DIRECTORY, '.');
            const filenames = _.map(files, method('getPath'));
            _.difference([
                'file.root',
                'dir',
                'dir.deep'
            ], filenames).should.be.empty();
        });

        it('should list files from dir', () => {
            const files = DirUtils.read(NESTED_DIRECTORY, 'dir.deep/');
            const filenames = _.map(files, method('getPath'));
            _.difference([
                'dir.deep/file1',
                'dir.deep/dir'
            ], filenames).should.be.empty();
        });

        it('should differentiate directories and files', () => {
            const all = _.partition(DirUtils.read(NESTED_DIRECTORY, '.'), (file) => {
                return file.isDirectory();
            });
            const dirs = all[0];
            const files = all[1];

            const filenames = _.map(files, method('getPath'));
            const dirnames = _.map(dirs, method('getPath'));

            _.difference([
                'file.root'
            ], filenames).should.be.empty();
            _.difference([
                'dir',
                'dir.deep'
            ], dirnames).should.be.empty();
        });

        it('should be flexible with paths', () => {
            [
                'dir.deep',
                'dir.deep/',
                './dir.deep/'
            ]
            .map((path) => {
                return DirUtils.read(NESTED_DIRECTORY, path);
            })
            .map((files) => {
                return files.map(method('getPath'));
            })
            .map((currentValue, index, array) => {
                // Should all equal the first
                _.difference(currentValue, array[0]).should.be.empty();
            });
        });
    });

    describe('.readRecursive', () => {

        it('should list files from root', () => {
            const files = DirUtils.readRecursive(NESTED_DIRECTORY, '.');
            const filenames = _.map(files, method('getPath'));
            _.difference([
                'file.root',
                'dir',
                'dir/file1',
                'dir/file2',
                'dir.deep',
                'dir.deep/file1',
                'dir.deep/dir',
                'dir.deep/dir/file1'
            ], filenames).should.be.empty();
        });

        it('should list files from dir', () => {
            const files = DirUtils.readRecursive(NESTED_DIRECTORY, 'dir.deep/');
            const filenames = _.map(files, method('getPath'));
            _.difference([
                'dir.deep/file1',
                'dir.deep/dir',
                'dir.deep/dir/file1'
            ], filenames).should.be.empty();
        });

        it('should differentiate directories and files', () => {
            const all = _.partition(DirUtils.readRecursive(NESTED_DIRECTORY, '.'), (file) => {
                return file.isDirectory();
            });
            const dirs = all[0];
            const files = all[1];

            const filenames = _.map(files, method('getPath'));
            const dirnames = _.map(dirs, method('getPath'));

            _.difference([
                'file.root',
                'dir/file1',
                'dir/file2',
                'dir.deep/file1',
                'dir.deep/dir/file1'
            ], filenames).should.be.empty();
            _.difference([
                'dir',
                'dir.deep',
                'dir.deep/dir'
            ], dirnames).should.be.empty();
        });

        it('should be flexible with paths', () => {
            [
                'dir.deep',
                'dir.deep/',
                './dir.deep/'
            ]
            .map((path) => {
                return DirUtils.readRecursive(NESTED_DIRECTORY, path);
            })
            .map((files) => {
                return files.map(method('getPath'));
            })
            .map((currentValue, index, array) => {
                // Should all equal the first
                _.difference(currentValue, array[0]).should.be.empty();
            });
        });
    });

    describe('.readFilenamesRecursive', () => {

        it('should list filenames recursively from root', () => {
            const files = DirUtils.readFilenamesRecursive(NESTED_DIRECTORY, '.');
            _.difference(INITIAL_FILES, files).should.be.empty();
        });

        it('should list filenames recursively from dir', () => {
            const filesDeep = DirUtils.readFilenamesRecursive(NESTED_DIRECTORY, 'dir/');
            _.difference([
                'dir/file1',
                'dir/file2'
            ], filesDeep).should.be.empty();
        });

        it('should be flexible with paths', () => {
            [
                'dir.deep',
                'dir.deep/',
                './dir.deep/'
            ].map((path) => {
                return DirUtils.readFilenamesRecursive(NESTED_DIRECTORY, path);
            }).map((files) => {
                _.difference([
                    'dir.deep/file1',
                    'dir.deep/dir/file1'
                ], files).should.be.empty();
            });
        });
    });

    describe('.readFilenames', () => {
        it('should shallow list root filenames', () => {
            const files = DirUtils.readFilenames(NESTED_DIRECTORY, './');
            _.difference(['file.root'], files).should.be.empty();
        });

        it('should shallow list all filenames in a dir', () => {
            const files = DirUtils.readFilenames(NESTED_DIRECTORY, 'dir');
            _.difference([
                'dir/file1',
                'dir/file2'
            ], files).should.be.empty();
        });

        it('should shallow list all filenames and dir in a dir', () => {
            const files = DirUtils.readFilenames(NESTED_DIRECTORY, './dir.deep/');
            _.difference([
                'dir.deep/file1',
                'dir.deep/dir'
            ], files).should.be.empty();
        });
    });

    describe('.move', () => {
        it('should be able to rename a dir', () => {
            const renamedRepo = DirUtils.move(NESTED_DIRECTORY, 'dir', 'newName');

            const files = DirUtils.readFilenamesRecursive(renamedRepo, '.');
            _.difference([
                'file.root',
                'newName/file1',
                'newName/file2',
                'dir.deep/file1',
                'dir.deep/dir/file1'
            ], files).should.be.empty();
        });

        it('should be kind with the cache (keeping SHAs when possible)', () => {
            const renamedRepo = DirUtils.move(NESTED_DIRECTORY, 'dir', 'newName');

            // The read should not fail because the content should be fetched
            FileUtils.readAsString(renamedRepo, 'newName/file1')
                .should.equal('dir/file1'); // original content
        });
    });

    describe('.remove', () => {
        it('should be able to remove a dir', () => {
            const removedRepo = DirUtils.remove(NESTED_DIRECTORY, 'dir.deep');

            const files = DirUtils.readFilenamesRecursive(removedRepo, '.');
            _.difference([
                'file.root',
                'dir/file1',
                'dir/file2'
            ], files).should.be.empty();
        });
    });
});

// Utils
function method(name) {
    return function(object) {
        return object[name]();
    };
}
