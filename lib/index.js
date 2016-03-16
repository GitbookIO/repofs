var GitHubDriver = require('./drivers/github');
var RepositoryState =require('./models/repositoryState');
var WorkingState = require('./models/workingState');

var CHANGE_TYPE = require('./constants/changeType');

var WorkingUtils = require('./utils/working');
var FileUtils = require('./utils/file');
var DirUtils = require('./utils/directory');
var RepoUtils = require('./utils/repo');
var ChangeUtils = require('./utils/change');

var decodeWorkingState = require('./decoding/workingState');

module.exports = {
    // Drivers
    GitHubDriver: GitHubDriver,

    // Models
    RepositoryState: RepositoryState,
    WorkingState: WorkingState,

    // Constants
    CHANGE: CHANGE_TYPE,

    // Utilities
    WorkingUtils: WorkingUtils,
    FileUtils: FileUtils,
    DirUtils: DirUtils,
    RepoUtils: RepoUtils,
    ChangeUtils: ChangeUtils,

    // Decoding
    decodeWorkingState: decodeWorkingState
};

