// Validates a SHA in hexadecimal
function validateSha(str) {
    return (/[0-9a-f]{40}/).test(str);
}

exports.validateSha = validateSha;
