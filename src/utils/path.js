const path = require('path');

/**
 * Normalize a path
 */
function normPath(p) {
    p = path.normalize(p);
    if (p[0] == '/') p = p.slice(1);
    if (p[p.length - 1] == '/') p = p.slice(0, -1);
    if (p == '.') p = '';
    return p;
}

/**
 * Returns true if the path is under dir
 */
function pathContains(dir, path) {
    dir = dir ? normPath(dir) + '/' : dir;
    path = normPath(path);

    return path.indexOf(dir) === 0;
}

module.exports = {
    norm: normPath,
    contains: pathContains
};
