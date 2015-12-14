var md5Hex = require('md5-hex');

// Get gravatar url
function gravatarUrl(email) {
    return 'http://www.gravatar.com/avatar/'+md5Hex(email)+'?s=200&d=identicon';
}

module.exports = {
    url: gravatarUrl
};
