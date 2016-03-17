var encodeTreeEntry = require('./treeEntry');
var encodeChange = require('./change');

function encodeWorkingState(workingState) {
    return {
        head: workingState.get('head'),
        treeEntries: workingState.get('treeEntries').map(encodeTreeEntry).toJS(),
        changes: workingState.get('branches').map(encodeChange).toJS()
    };
}

module.exports = encodeWorkingState;
