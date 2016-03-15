var util = require('util');
var path = require('path');
var immutable = require('immutable');

var FILETYPE = require('../constants/fileType');

/*
A File represents an entry from the git tree (file or directory).
*/

var FileRecord = immutable.Record({
    path: '',
    size: 0,
    sha: '',
    type: FILETYPE.FILE,
    content: ''
});

function File() {

}
util.inherits(File, FileRecord);

// Return filename
File.prototype.getPath = function() {
    return path.basename(this.get('path'));
};

// ---- Properties Getter ----
File.prototype.getPath = function() {
    return this.get('path');
};

File.prototype.getType = function() {
    return this.get('type');
};

File.prototype.getContent = function() {
    return this.get('content');
};

File.prototype.getSHA = function() {
    return this.get('sha');
};


module.exports = File;
