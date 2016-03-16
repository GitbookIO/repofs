var ERRORS = require('../constants/error');

// Return an error with a specific code
function withCode(code, msg) {
    var err = new Error(msg);
    err.code = code;
    return err;
}

module.exports = {
    invalidArgs: function(err) {
        return withCode(400, err);
    },
    fileAlreadyExist: function(filepath) {
        return withCode(ERRORS.ALREADY_EXIST, 'File already exist "'+filepath+'"');
    },
    dirAlreadyExist: function(filepath) {
        return withCode(ERRORS.ALREADY_EXIST, 'Directory already exist "'+filepath+'"');
    },
    fileNotFound: function(filepath) {
        return withCode(ERRORS.NOT_FOUND, 'File not found "'+filepath+'"');
    },
    notDirectory: function(filepath) {
        return withCode(406, '"'+filepath+'" is not a directory');
    },
    refNotFound: function(ref) {
        return withCode(ERRORS.NOT_FOUND, 'Ref not found "'+ref+'"');
    },
    commitNotFound: function(sha) {
        return withCode(ERRORS.NOT_FOUND, 'Commit not found "'+sha+'"');
    },
    fileHasBeenModified: function(filepath) {
        return withCode(406, 'File "'+filepath+'" has been modified');
    }
};
