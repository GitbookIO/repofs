var immutable = require('immutable');

var bufferUtil = require('../lib/utils/arraybuffer');

var Cache = require('../lib/models/cache');
var CacheUtils = require('../lib/utils/cache');
var Change = require('../lib/models/change');
var TreeEntry = require('../lib/models/treeEntry');
var Branch = require('../lib/models/branch');
var WorkingState = require('../lib/models/workingState');
var RepositoryState = require('../lib/models/repositoryState');

// Creates a clean repoState for a default book with branches and files already fetched
// * SUMMARY.md "# Summary"
// * README.md "# Introduction"
function defaultBook() {
    var readmeEntry = new TreeEntry({
        blobSize: 14,
        sha: 'readmeSha',
        mode: '100644'
    });

    var summaryEntry = new TreeEntry({
        blobSize: 9,
        sha: 'summarySha',
        mode: '100644'
    });

    var masterBranch = new Branch({
        shortName: 'master',
        sha: 'masterSha',
        remote: ''
    });

    var workingState = new WorkingState({
        head: 'defaultBookWorkingSha',
        treeEntries: new immutable.Map({
            'README.md': readmeEntry,
            'SUMMARY.md': summaryEntry
        })
        // No changes
    });

    // Already fetched blobs
    var cache = new Cache();
    cache = CacheUtils.addBlob(cache, {
        sha: 'readmeSha',
        content: bufferUtil.fromString('# Introduction')
    });
    cache = CacheUtils.addBlob(cache, {
        sha: 'summarySha',
        content: bufferUtil.fromString('# Summary')
    });

    return new RepositoryState({
        currentBranchName: 'master',
        workingStates: new immutable.Map().set(masterBranch.getName(), workingState),
        branches: new immutable.Map().set(masterBranch.getName(), masterBranch),
        cache: cache
    });
}

module.exports = {
    defaultBook: defaultBook
};
