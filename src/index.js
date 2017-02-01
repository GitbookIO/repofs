
const GitHubDriver = require('./drivers/github');

const RepositoryState = require('./models/repositoryState');
const WorkingState = require('./models/workingState');
const TreeEntry = require('./models/treeEntry');
const Author = require('./models/author');
const Branch = require('./models/branch');
const CommitBuilder = require('./models/commitBuilder');
const Conflict = require('./models/conflict');
const TreeConflict = require('./models/treeConflict');
const File = require('./models/file');
const Blob = require('./models/blob');
const FileDiff = require('./models/fileDiff');
const Comparison = require('./models/comparison');

const CHANGE = require('./constants/changeType');
const ERRORS = require('./constants/errors');

const WorkingUtils = require('./utils/working');
const TreeUtils = require('./utils/filestree');
const FileUtils = require('./utils/file');
const LocalUtils = require('./utils/localFile');
const BlobUtils = require('./utils/blob');
const DirUtils = require('./utils/directory');
const RepoUtils = require('./utils/repo');
const BranchUtils = require('./utils/branches');
const ChangeUtils = require('./utils/change');
const CommitUtils = require('./utils/commit');
const ConflictUtils = require('./utils/conflict');
const RemoteUtils = require('./utils/remote');

module.exports = {
    // Drivers
    GitHubDriver,

    // Models
    RepositoryState,
    WorkingState,
    TreeEntry,
    File,
    Blob,
    Author,
    Branch,
    CommitBuilder,
    Conflict,
    TreeConflict,
    FileDiff,
    Comparison,

    // Constants
    CHANGE,
    ERRORS,

    // Utilities
    WorkingUtils,
    TreeUtils,
    FileUtils,
    LocalUtils,
    BlobUtils,
    DirUtils,
    RepoUtils,
    BranchUtils,
    ChangeUtils,
    CommitUtils,
    ConflictUtils,
    RemoteUtils,

    // Decoding
    decodeWorkingState: WorkingState.decode
};
