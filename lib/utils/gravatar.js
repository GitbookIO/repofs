var md5Hex = require('md5-hex');

// Get gravatar url
function gravatarUrl(email) {
    return 'https://www.gravatar.com/avatar/'+md5Hex(email)+'?s=200&d='+encodeURIComponent('https://www.gitbook.com/assets/images/avatars/user.png');
}

module.exports = {
    url: gravatarUrl
};
