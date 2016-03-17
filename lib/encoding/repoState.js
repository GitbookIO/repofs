var _ = require('lodash');

var encodeWorkingState = require('./workingState');
var encodeBranch = require('./branch');

// Encodes a RepositoryState as a JSONifyable object
// @param {RepositoryState}
// @return {Object} As plain JS
function encodeRepoState(repoState) {
    return {
        currentBranchName: repoState.get('currentBranchName'),
        workingStates: repoState.get('workingStates').map(encodeWorkingState).toJS(),
        branches: repoState.get('branches').map(encodeBranch).toJS()
    };
}

module.exports = encodeRepoState;
