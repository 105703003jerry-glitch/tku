var crypto = require('crypto');

function json(res, status, body) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
}

function noStore(res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
}

function jsonWithRequestId(req, res, status, body) {
    var payload = body;

    if (body && typeof body === 'object' && !Array.isArray(body)) {
        payload = Object.assign({}, body, {
            requestId: getRequestId(req, res)
        });
    }

    json(res, status, payload);
}

function sanitize(value, maxLength) {
    var limit = typeof maxLength === 'number' ? maxLength : 500;
    return String(value || '').replace(/\u0000/g, '').trim().slice(0, limit);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function parseBody(req) {
    if (!req || typeof req.body === 'undefined' || req.body === null) {
        return {};
    }

    if (typeof req.body === 'string') {
        return JSON.parse(req.body || '{}');
    }

    return req.body;
}

function parseCookies(req) {
    var header = req && req.headers ? req.headers.cookie : '';
    var source = String(header || '');
    var cookies = {};

    if (!source) {
        return cookies;
    }

    source.split(';').forEach(function(part) {
        var segment = part.trim();
        var divider = segment.indexOf('=');
        var key;
        var value;

        if (divider === -1) {
            return;
        }

        key = segment.slice(0, divider).trim();
        value = segment.slice(divider + 1).trim();

        if (!key) {
            return;
        }

        cookies[key] = decodeURIComponent(value);
    });

    return cookies;
}

function serializeCookie(name, value, options) {
    var settings = options || {};
    var parts = [name + '=' + encodeURIComponent(value)];

    parts.push('Path=' + (settings.path || '/'));
    parts.push('HttpOnly');
    parts.push('SameSite=' + (settings.sameSite || 'Lax'));

    if (settings.secure !== false) {
        parts.push('Secure');
    }

    if (typeof settings.maxAge === 'number') {
        parts.push('Max-Age=' + Math.max(0, Math.floor(settings.maxAge)));
    }

    if (settings.expires) {
        parts.push('Expires=' + settings.expires.toUTCString());
    }

    return parts.join('; ');
}

function setCookie(res, name, value, options) {
    res.setHeader('Set-Cookie', serializeCookie(name, value, options));
}

function appendCookie(res, name, value, options) {
    var existing = res.getHeader('Set-Cookie');
    var nextValue = serializeCookie(name, value, options);

    if (!existing) {
        res.setHeader('Set-Cookie', nextValue);
        return;
    }

    if (Array.isArray(existing)) {
        res.setHeader('Set-Cookie', existing.concat(nextValue));
        return;
    }

    res.setHeader('Set-Cookie', [existing, nextValue]);
}

function redirect(res, location, statusCode) {
    res.statusCode = statusCode || 302;
    res.setHeader('Location', location);
    res.end('');
}

function getOrigin(req) {
    var forwardedHost = req && req.headers ? sanitize(req.headers['x-forwarded-host'], 255) : '';
    var host = forwardedHost || sanitize(req && req.headers ? req.headers.host : '', 255);
    var forwardedProto = sanitize(req && req.headers ? req.headers['x-forwarded-proto'] : '', 40);
    var proto = forwardedProto || 'https';

    if (!host) {
        return '';
    }

    return proto + '://' + host;
}

function allowMethods(res, methods) {
    res.setHeader('Allow', methods.join(', '));
}

function createRequestId() {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return crypto.randomBytes(12).toString('hex');
}

function getRequestId(req, res) {
    var existing = req && req.__requestId ? req.__requestId : '';
    var requestId = existing || createRequestId();

    if (req) {
        req.__requestId = requestId;
    }

    if (res) {
        res.setHeader('X-Request-Id', requestId);
    }

    return requestId;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripHtml(value) {
    return String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getClientIp(req) {
    var forwarded = req && req.headers ? req.headers['x-forwarded-for'] : '';
    var remote = req && req.socket ? req.socket.remoteAddress : '';
    var first;

    if (forwarded) {
        first = String(forwarded).split(',')[0].trim();
        if (first) {
            return first;
        }
    }

    return String(remote || '');
}

function getUserAgent(req) {
    return sanitize(req && req.headers ? req.headers['user-agent'] : '', 500);
}

module.exports = {
    allowMethods: allowMethods,
    appendCookie: appendCookie,
    createRequestId: createRequestId,
    escapeHtml: escapeHtml,
    getClientIp: getClientIp,
    getOrigin: getOrigin,
    getRequestId: getRequestId,
    getUserAgent: getUserAgent,
    json: json,
    jsonWithRequestId: jsonWithRequestId,
    noStore: noStore,
    parseBody: parseBody,
    parseCookies: parseCookies,
    redirect: redirect,
    sanitize: sanitize,
    serializeCookie: serializeCookie,
    setCookie: setCookie,
    stripHtml: stripHtml,
    validateEmail: validateEmail
};
