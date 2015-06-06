
// Return an error with a specific code
function withCode(code, msg) {
    var err = new Error(msg);
    err.code = code;
    return err;
}



module.exports = {
    fileAlreadyExist: function(filepath) {
        return withCode(409, 'File already exist "'+filepath+'"');
    },
    fileNotFound: function(filepath) {
        return withCode(404, 'File not found "'+filepath+'"');
    },
    fileHasBeenModified: function(filepath) {
        return withCode(406, 'File "'+filepath+'" has been modified');
    }
};


