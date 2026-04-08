var http = require('./http');

function normalizeOrigin(origin) {
    return String(origin || '').replace(/\/$/, '').toLowerCase();
}

function getAllowedOrigins(req) {
    var allowlist = String(process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(function(item) {
            return normalizeOrigin(item.trim());
        })
        .filter(Boolean);
    var host = String((req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '').trim();

    if (host) {
        allowlist.push(normalizeOrigin('https://' + host));
        allowlist.push(normalizeOrigin('http://' + host));
    }

    return allowlist;
}

function isTrustedOrigin(req) {
    var origin = normalizeOrigin(req.headers && req.headers.origin);
    var referer = normalizeOrigin(req.headers && req.headers.referer);
    var allowedOrigins = getAllowedOrigins(req);
    var candidate = origin || (referer ? referer.split('/', 3).join('/') : '');

    if (!candidate) {
        return true;
    }

    return allowedOrigins.indexOf(candidate) !== -1;
}

function requireTrustedOrigin(req, res, errors) {
    if (isTrustedOrigin(req)) {
        return true;
    }

    errors.jsonError(req, res, 403, 'Request origin is not allowed.');
    return false;
}

module.exports = {
    isTrustedOrigin: isTrustedOrigin,
    requireTrustedOrigin: requireTrustedOrigin
};
