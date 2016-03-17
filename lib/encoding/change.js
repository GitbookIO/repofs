function encodeChange(change) {
    change.get('content');
    return {
        type: change.get('type'),
        // Encode Buffer as base64 string
        content: change.get('content').toString('base64'),
        sha: change.get('sha'),
        message: change.get('message')
    };
}

module.exports = encodeChange;
