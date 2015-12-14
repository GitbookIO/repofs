
// Return true if it's a sha
function isSHA(val) {
    return (/[0-9a-f]{40}/).test(val);
}


module.exports = {
    is: isSHA
};

