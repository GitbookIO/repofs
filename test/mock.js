var _ = require('lodash');
var immutable = require('immutable');

var bufferUtil = require('../lib/utils/arraybuffer');

var Cache = require('../lib/models/cache');
var CacheUtils = require('../lib/utils/cache');
var Change = require('../lib/models/change');
var TreeEntry = require('../lib/models/treeEntry');
var Branch = require('../lib/models/branch');
var WorkingState = require('../lib/models/workingState');
var RepositoryState = require('../lib/models/repositoryState');


// Return empty repo with single master branch
function emptyRepo() {
    var masterBranch = new Branch({
        shortName: 'master',
        sha: 'sha.master',
        remote: ''
    });

    var workingState = new WorkingState({
        head: 'sha.working.master',
        treeEntries: new immutable.Map()
    });

    return new RepositoryState({
        currentBranchName: 'master',
        workingStates: new immutable.Map().set(masterBranch.getName(), workingState),
        branches: new immutable.Map().set(masterBranch.getName(), masterBranch)
        // No cache
    });
}

// Adds a file to the repo, with content equal to filepath.
// options.fetched for already fetched in cache
// options.branch to specify a branch
// options.content to specify content
function addFile(repoState, filepath, options) {
    options = _.defaults({}, options || {}, {
        branch: 'master',
        fetched: true,
        content: filepath
    });

    var treeEntry = new TreeEntry({
        blobSize: options.content.length,
        sha: 'sha.'+options.content,
        mode: '100644'
    });
    var resultState = repoState;

    // Update working state
    var workingState = resultState.getCurrentState();
    workingState = workingState
        .set('treeEntries', workingState
             .getTreeEntries().set(filepath, treeEntry));

    var workingStates = resultState.getWorkingStates();
    resultState = resultState
        .set('workingStates', workingStates
             .set(options.branch, workingState));

    // Update cache
    if(options.fetched) {
        var cache = repoState.getCache();
        cache = CacheUtils.addBlob(cache, {
            sha: 'sha.'+options.content,
            content: bufferUtil.fromString(options.content)
        });
        resultState = resultState.set('cache', cache);
    }
    return resultState;
}


// Creates a clean repoState for a default book with branches and files already fetched
// * SUMMARY.md "# Summary"
// * README.md "# Introduction"
function defaultBook() {
    var resultState = emptyRepo();
    resultState = addFile(resultState, 'README.md', {
        content: '# Introduction'
    });
    resultState = addFile(resultState, 'SUMMARY.md', {
        content: '# Summary'
    });
    return resultState;
}

// Creates a nested directory structure for testing (already fetched)
function directoryStructure() {
    var resultState = emptyRepo();
    resultState = addFile(resultState, 'file.root');
    resultState = addFile(resultState, 'dir.twoItems/file1');
    resultState = addFile(resultState, 'dir.twoItems/file2');
    resultState = addFile(resultState, 'dir.deep.oneItem/file1');
    resultState = addFile(resultState, 'dir.deep.oneItem/dir.oneItem/file1');
    return resultState;
}

module.exports = {
    DEFAULT_BOOK: defaultBook(),
    NESTED_DIRECTORY: directoryStructure()
};
