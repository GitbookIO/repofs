// These codes are meant to be exported, for dev to react to runtime
// errors.
// We will always throw Errors with these values as code property.
var ERRORS = {
    ALREADY_EXIST: 302,
    NOT_FAST_FORWARD: 433,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNKNOWN_REMOTE: '404 Unknown Remote',
    AUTHENTICATION_FAILED: '401 Authentication Failed',
    BLOB_TOO_BIG: 507
};
// TODO drop HTTP codes completely, for more reliable error checking (no collision)

module.exports = ERRORS;
