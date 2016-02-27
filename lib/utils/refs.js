
// Return name of a ref for a remote branch
function remote(origin, name) {
    return 'remotes/' + origin + '/' + name;
}

// Return name of a ref for a local branch
function local(name) {
    return 'heads/' + name;
}

module.exports = {
    local: local,
    remote: remote
};
