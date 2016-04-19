// These codes are meant to be exported, for dev to react to runtime
// errors.
// We will always throw Errors with a message and a code property.
var ERRORS = {
    ALREADY_EXIST: 302,
    NOT_FAST_FORWARD: 433,
    NOT_FOUND: 404,
    CONFLICT: 409
};

module.exports = ERRORS;
