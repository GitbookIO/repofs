var _ = require('lodash');
var immutable = require('immutable');

var RepositoryState = require('../models/repositoryState');
var decodeWorkingState = require('./changes');

function decodeRepoState(json) {
    var workingStates = _.mapValues(json.workingStates, decodeWorkingState);
    workingStates = new immutable.Map(workingStates);

    return new RepositoryState({
        currentBranchName: json.currentBranchName,
        workingStates: workingStates
    });
}

module.exports = decodeRepoState;
