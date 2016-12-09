// These codes are meant to be exported, for dev to react to runtime
// errors.
// We will always throw Errors with these values as code property.
const ERRORS = {
    ALREADY_EXIST:         '302 Already exist',
    NOT_FAST_FORWARD:      '433 Not fast forward',
    NOT_FOUND:             '404 Not found',
    CONFLICT:              '409 Conflict',
    UNKNOWN_REMOTE:        '404 Unknown Remote',
    AUTHENTICATION_FAILED: '401 Authentication Failed',
    BLOB_TOO_BIG:          '507 Blog too large',
    REF_NOT_FOUND:         '404 Reference not found'
};
// TODO drop HTTP codes completely, for more reliable error checking (no collision)

module.exports = ERRORS;
