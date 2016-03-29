// Return name of a ref for a remote branch
function remote(origin, name) {
    return 'remotes/' + origin + '/' + name;
}

// Return name of a ref for a local branch
function local(name) {
    return 'heads/' + name;
}

// Return name of a ref for a local branch
function unspecifyLocal(localRef) {
    if(localRef.indexOf('heads/') === 0) {
        return localRef.substring('heads/'.length);
    } else {
        return localRef;
    }
}

module.exports = {
    local: local,
    remote: remote,
    unspecifyLocal: unspecifyLocal
};
