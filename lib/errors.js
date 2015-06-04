
// Return an error with a specific code
function withCode(code, msg) {
    var err = new Error(msg);
    err.code = code;
    return err;
}



module.exports = {
    fileNotFound: function(filepath) {
        return withCode(404, 'File not found "'+filepath+'"');
    }
};
