const ERRORS = require('../constants/errors');

/**
 * Return an error with a specific code
 */
function withCode(code, msg) {
    const err = new Error(msg);
    err.code = code;
    return err;
}

module.exports = {
    invalidArgs(err) {
        return withCode(400, err);
    },
    fileAlreadyExist(filepath) {
        return withCode(ERRORS.ALREADY_EXIST, 'File already exist "' + filepath + '"');
    },
    dirAlreadyExist(filepath) {
        return withCode(ERRORS.ALREADY_EXIST, 'Directory already exist "' + filepath + '"');
    },
    fileNotFound(filepath) {
        return withCode(ERRORS.NOT_FOUND, 'File not found "' + filepath + '"');
    },
    notDirectory(filepath) {
        return withCode(406, '"' + filepath + '" is not a directory');
    },
    refNotFound(ref) {
        return withCode(ERRORS.NOT_FOUND, 'Ref not found "' + ref + '"');
    },
    commitNotFound(sha) {
        return withCode(ERRORS.NOT_FOUND, 'Commit not found "' + sha + '"');
    },
    fileHasBeenModified(filepath) {
        return withCode(406, 'File "' + filepath + '" has been modified');
    }
};
