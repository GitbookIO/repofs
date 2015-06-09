var diffMatchPatch = require('diff-match-patch-node');

// Return diff as a string between 2 strings
function createFromCompare(from, to) {
    var instance = diffMatchPatch();
    var patches = instance.patch_make(from, to);
    return instance.patch_toText(patches);
}

// Parse a patch to extract additions/deletions
function parsePatch(patch) {
    var instance = diffMatchPatch();
    var parsed = instance.patch_fromText(patch)
    console.log(parsed);

    return {
        additions: 0,
        deletions: 0
    }
}

module.exports = {
    compare: createFromCompare,
    parse: parsePatch
};
