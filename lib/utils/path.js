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

    console.log('test contains', dir, file);
    return file.indexOf(dir) === 0;
}

module.exports = {
    norm: normPath,
    contains: pathContains
}
