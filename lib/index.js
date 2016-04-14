
var GitHubDriver = require('./drivers/github');

var RepositoryState =require('./models/repositoryState');
var WorkingState = require('./models/workingState');
var Author = require('./models/author');
var Branch = require('./models/branch');
var CommitBuilder = require('./models/commitBuilder');
var Conflict = require('./models/conflict');
var TreeConflict = require('./models/treeConflict');
var File = require('./models/file');

var CHANGE_TYPE = require('./constants/changeType');
var ERRORS = require('./constants/errors');

var WorkingUtils = require('./utils/working');
var TreeUtils = require('./utils/filestree');
var FileUtils = require('./utils/file');
var DirUtils = require('./utils/directory');
var RepoUtils = require('./utils/repo');
var BranchUtils = require('./utils/branches');
var ChangeUtils = require('./utils/change');
var CommitUtils = require('./utils/commit');
var ConflictUtils = require('./utils/conflict');

module.exports = {
    // Drivers
    GitHubDriver: GitHubDriver,

    // Models
    RepositoryState: RepositoryState,
    WorkingState: WorkingState,
    File: File,
    Author: Author,
    Branch: Branch,
    CommitBuilder: CommitBuilder,
    Conflict: Conflict,
    TreeConflict: TreeConflict,

    // Constants
    CHANGE: CHANGE_TYPE,
    ERRORS: ERRORS,

    // Utilities
    WorkingUtils: WorkingUtils,
    TreeUtils: TreeUtils,
    FileUtils: FileUtils,
    DirUtils: DirUtils,
    RepoUtils: RepoUtils,
    BranchUtils: BranchUtils,
    ChangeUtils: ChangeUtils,
    CommitUtils: CommitUtils,
    ConflictUtils: ConflictUtils,

    // Decoding
    decodeWorkingState: WorkingState.decode
};
