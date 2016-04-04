var GitHubDriver = require('./drivers/github');

var RepositoryState =require('./models/repositoryState');
var WorkingState = require('./models/workingState');
var Author = require('./models/author');
var Branch = require('./models/branch');
var CommitBuilder = require('./models/commitBuilder');

var CHANGE_TYPE = require('./constants/changeType');
var ERROR = require('./constants/errors');

var WorkingUtils = require('./utils/working');
var FileUtils = require('./utils/file');
var DirUtils = require('./utils/directory');
var RepoUtils = require('./utils/repo');
var BranchUtils = require('./utils/branches');
var ChangeUtils = require('./utils/change');
var CommitUtils = require('./utils/commit');

module.exports = {
    // Drivers
    GitHubDriver: GitHubDriver,

    // Models
    RepositoryState: RepositoryState,
    WorkingState: WorkingState,
    Author: Author,
    Branch: Branch,
    CommitBuilder: CommitBuilder,

    // Constants
    CHANGE: CHANGE_TYPE,
    ERROR: ERROR,

    // Utilities
    WorkingUtils: WorkingUtils,
    FileUtils: FileUtils,
    DirUtils: DirUtils,
    RepoUtils: RepoUtils,
    BranchUtils: BranchUtils,
    ChangeUtils: ChangeUtils,
    CommitUtils: CommitUtils,

    // Decoding
    decodeWorkingState: WorkingState.decode
};
