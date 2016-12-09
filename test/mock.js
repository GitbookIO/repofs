const _ = require('lodash');
const Immutable = require('immutable');


const CacheUtils = require('../src/utils/cache');
const TreeEntry = require('../src/models/treeEntry');
const Branch = require('../src/models/branch');
const Blob = require('../src/models/blob');
const WorkingState = require('../src/models/workingState');
const RepositoryState = require('../src/models/repositoryState');


// Return empty repo with single master branch
function emptyRepo() {
    const masterBranch = new Branch({
        name: 'master',
        sha: 'masterSha',
        remote: ''
    });

    const workingState = new WorkingState({
        head: 'sha.working.master',
        treeEntries: new Immutable.Map()
    });

    return new RepositoryState({
        currentBranchName: 'master',
        workingStates: new Immutable.Map().set(masterBranch.getName(), workingState),
        branches: new Immutable.List().push(masterBranch)
        // No cache
    });
}

// Adds a file to the repo, with content equal to filepath.
// options.fetched for already fetched in cache
// options.branch to specify a branch
// options.content to specify content
function addFile(repoState, filepath, options) {
    options = _.defaults({}, options || {}, {
        branch: repoState.getCurrentBranchName(),
        fetched: true,
        content: filepath
    });
    options.branch = repoState.getBranch(options.branch);

    const treeEntry = new TreeEntry({
        blobSize: options.content.length,
        sha: 'sha.' + options.content,
        mode: '100644'
    });
    let resultState = repoState;

    // Update working state
    let workingState = resultState.getWorkingStateForBranch(options.branch);
    workingState = workingState
        .set('treeEntries', workingState
             .getTreeEntries().set(filepath, treeEntry));

    const workingStates = resultState.getWorkingStates();
    resultState = resultState
        .set('workingStates', workingStates
             .set(options.branch.getFullName(), workingState));

    // Update cache
    if (options.fetched) {
        let cache = repoState.getCache();
        cache = CacheUtils.addBlob(
            cache,
            'sha.' + options.content,
            Blob.createFromString(options.content)
        );
        resultState = resultState.set('cache', cache);
    }
    return resultState;
}


// Creates a clean repoState for a default book with branches and files already fetched
// * SUMMARY.md "# Summary"
// * README.md "# Introduction"
function defaultBook() {
    let resultState = emptyRepo();
    resultState = addFile(resultState, 'README.md', {
        content: '# Introduction'
    });
    resultState = addFile(resultState, 'SUMMARY.md', {
        content: '# Summary'
    });
    return resultState;
}

// Creates a nested directory structure for testing (already fetched)
// file.root
// dir.twoItems/file1
// dir.twoItems/file2
// dir.deep.oneItem/file1
// dir.deep.oneItem/dir.oneItem/file1
function directoryStructure(pathList) {
    return pathList.reduce(function(repo, path) {
        return addFile(repo, path);
    }, emptyRepo());
}

// Make a big repo with 'n' files each in a directory at 'depth'
function bigFileList(n, depth) {
    depth = depth || 1;
    const indexes = Immutable.Range(1, n);
    return indexes.map(function(index) {
        const depths = Immutable.Range(0, depth);
        return depths.map(function(depth) {
            return index + '.' + depth;
        }).toArray().join('/');
    }).toArray();
}

module.exports = {
    emptyRepo,
    DEFAULT_BOOK: defaultBook(),
    bigFileList,
    addFile,
    directoryStructure
};
