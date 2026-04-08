var http = require('./http');

function logError(requestId, error, context) {
    var payload = {
        level: 'error',
        requestId: requestId,
        context: context || 'api',
        message: error && error.message ? error.message : 'Unknown error',
        stack: error && error.stack ? error.stack : null
    };

    console.error(JSON.stringify(payload));
}

function jsonError(req, res, status, message) {
    var requestId = http.getRequestId(req, res);
    http.json(res, status, {
        ok: false,
        error: message,
        requestId: requestId
    });
}

function handleApiError(req, res, error, publicMessage, status, context) {
    var requestId = http.getRequestId(req, res);

    logError(requestId, error, context);
    http.json(res, status || 500, {
        ok: false,
        error: publicMessage || 'Unable to process request right now.',
        requestId: requestId
    });
}

module.exports = {
    handleApiError: handleApiError,
    jsonError: jsonError,
    logError: logError
};
