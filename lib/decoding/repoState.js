var _ = require('lodash');
var immutable = require('immutable');

var RepositoryState = require('../models/repositoryState');
var decodeWorkingState = require('./changes');

function decodeRepoState(json) {
    var workingStates = _.map(json.workingStates, decodeWorkingState);
    workingStates = new immutable.OrderedMap(workingStates);

    return new RepositoryState({
        currentBranchName: json.currentBranchName,
        workingStates: workingStates
    });
}

module.exports = decodeRepoState;
