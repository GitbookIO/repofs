var CHANGES = require('../constants/changeTypes');


// List files in a directory
// Return an Array of TreeEntry
function readDir(workingState, dirName) {

}

// Rename a directory
function moveDir(workingState, dirName, newName) {

}

// Remove a directory
function removeDir(workingState, dirName) {

}

module.exports = {
    read: readDir,
    remove: removeDir,
    move: moveDir
};
