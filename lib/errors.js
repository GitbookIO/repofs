var CODE = {
    ALREADY_EXIST: 302,
    NOT_FAST_FORWARD: 433,
    CONFLICT: 409
};

// Return an error with a specific code
function withCode(code, msg) {
    var err = new Error(msg);
    err.code = code;
    return err;
}


module.exports = {
    CODE: CODE,

    invalidArgs: function(err) {
        return withCode(400, err);
    },
    fileAlreadyExist: function(filepath) {
        return withCode(CODE.ALREADY_EXIST, 'File already exist "'+filepath+'"');
    },
    dirAlreadyExist: function(filepath) {
        return withCode(CODE.ALREADY_EXIST, 'Directory already exist "'+filepath+'"');
    },
    fileNotFound: function(filepath) {
        return withCode(404, 'File not found "'+filepath+'"');
    },
    notDirectory: function(filepath) {
        return withCode(406, '"'+filepath+'" is not a directory');
    },
    refNotFound: function(ref) {
        return withCode(404, 'Ref not found "'+ref+'"');
    },
    commitNotFound: function(sha) {
        return withCode(404, 'Commit not found "'+sha+'"');
    },
    fileHasBeenModified: function(filepath) {
        return withCode(406, 'File "'+filepath+'" has been modified');
    }
};


