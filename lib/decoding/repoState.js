var _ = require('lodash');
var immutable = require('immutable');

var RepositoryState = require('../models/repositoryState');
var decodeWorkingState = require('./workingState');
var decodeBranch = require('./branch');

function decodeRepoState(json) {
    var workingStates = new immutable.Map(_.mapValues(json.workingStates, decodeWorkingState));
    var branches = new immutable.Map(_.mapValues(json.branches, decodeBranch));

    return new RepositoryState({
        currentBranchName: json.currentBranchName,
        workingStates: workingStates,
        branches: branches
    });
}

module.exports = decodeRepoState;
