var _ = require('lodash');
var path = require('path');

// Normalize a path
function normPath(p) {
    p = path.normalize(p);
    if (p[0] == '/') p = p.slice(1);
    if (p[p.length - 1] == '/') p = p.slice(0, -1);
    if (p == '.') p = '';
    return p;
}

// Normalize a path
function pathContains(dir, file) {
    dir = dir? normPath(dir) + '/' : dir;
    file = normPath(file);

    return file.indexOf(dir) === 0;
}

// Convert a file path to a array of string for Immutable.Map updates
function keyPath(p, children) {
    var parts = p.split('/');

    return _.chain(parts)
        .map(function(part) {
            if (part == '.') return null;
            return part;
        })
        .compact()
        .map(function(name, i) {
            if (i == (parts.length - 1) && children !== true) return name;
            return [name, 'children'];
        })
        .flatten()
        .value();
}

module.exports = {
    norm: normPath,
    contains: pathContains,
    keys: keyPath
};
