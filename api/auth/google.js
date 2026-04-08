var auth = require('../_lib/auth');
var db = require('../_lib/db');
var errors = require('../_lib/errors');
var http = require('../_lib/http');
var crypto = require('crypto');

function getRedirectUri(req) {
    return process.env.GOOGLE_REDIRECT_URI || (http.getOrigin(req) + '/api/auth/google/callback');
}

function clearOAuthCookies(res) {
    http.appendCookie(res, 'tkclc_oauth_state', '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0)
    });
    http.appendCookie(res, 'tkclc_oauth_next', '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0)
    });
}

function normalizeNext(value) {
    var next = http.sanitize(value, 400) || '/app';

    if (!next || next.charAt(0) !== '/' || next.indexOf('//') === 0) {
        return '/app';
    }

    return next;
}

function renderPostAuthPage(res, next) {
    var destination = normalizeNext(next);
    var safeDestination = http.escapeHtml(destination);
    var html = '' +
        '<!DOCTYPE html>' +
        '<html lang="zh-TW">' +
        '<head>' +
            '<meta charset="UTF-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
            '<meta http-equiv="refresh" content="0;url=' + safeDestination + '">' +
            '<title>Signing In...</title>' +
        '</head>' +
        '<body>' +
            '<p>Signing you in. If you are not redirected automatically, <a href="' + safeDestination + '">continue here</a>.</p>' +
        '</body>' +
        '</html>';

    http.noStore(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
}

async function exchangeCodeForTokens(code, redirectUri) {
    var response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            code: code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        }).toString()
    });
    var data = await response.json();

    if (!response.ok || !data.access_token) {
        throw new Error(data.error_description || data.error || 'Unable to complete Google sign-in.');
    }

    return data;
}

async function fetchGoogleProfile(accessToken) {
    var response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
            Authorization: 'Bearer ' + accessToken
        }
    });
    var data = await response.json();

    if (!response.ok || !data.sub || !data.email) {
        throw new Error('Unable to load your Google profile.');
    }

    return data;
}

async function handleConfig(req, res) {
    http.noStore(res);
    http.jsonWithRequestId(req, res, 200, {
        ok: true,
        available: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    });
}

async function handleStart(req, res) {
    var next;
    var state;
    var url;

    http.noStore(res);

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        http.redirect(res, '/login?error=google_not_configured', 302);
        return;
    }

    next = normalizeNext(req.query && req.query.next);
    state = crypto.randomBytes(24).toString('hex');
    url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', getRedirectUri(req));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('prompt', 'select_account');
    url.searchParams.set('state', state);

    http.setCookie(res, 'tkclc_oauth_state', state, {
        path: '/',
        maxAge: 10 * 60
    });
    http.appendCookie(res, 'tkclc_oauth_next', next, {
        path: '/',
        maxAge: 10 * 60
    });

    http.redirect(res, url.toString(), 302);
}

async function handleCallback(req, res) {
    var cookies;
    var expectedState;
    var next;
    var redirectUri;
    var sql;
    var code;
    var returnedState;
    var tokens;
    var profile;
    var role;
    var rows;
    var session;

    http.noStore(res);

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        http.redirect(res, '/login?error=google_not_configured', 302);
        return;
    }

    cookies = http.parseCookies(req);
    expectedState = cookies.tkclc_oauth_state || '';
    next = normalizeNext(cookies.tkclc_oauth_next);
    code = http.sanitize(req.query && req.query.code, 600);
    returnedState = http.sanitize(req.query && req.query.state, 200);

    if (req.query && req.query.error) {
        clearOAuthCookies(res);
        http.redirect(res, '/login?error=google_cancelled', 302);
        return;
    }

    if (!code || !expectedState || expectedState !== returnedState) {
        clearOAuthCookies(res);
        http.redirect(res, '/login?error=google_state_invalid', 302);
        return;
    }

    redirectUri = getRedirectUri(req);
    tokens = await exchangeCodeForTokens(code, redirectUri);
    profile = await fetchGoogleProfile(tokens.access_token);
    sql = db.getSql();
    role = auth.getRoleForEmail(profile.email);

    rows = await sql`
        INSERT INTO users (
            name,
            email,
            auth_provider,
            google_sub,
            avatar_url,
            role,
            locale,
            last_login_at,
            updated_at
        )
        VALUES (
            ${http.sanitize(profile.name, 100) || http.sanitize(profile.email, 100)},
            ${auth.normalizeEmail(profile.email)},
            'google',
            ${profile.sub},
            ${http.sanitize(profile.picture, 500) || null},
            ${role},
            ${http.sanitize(profile.locale, 20) || null},
            NOW(),
            NOW()
        )
        ON CONFLICT (email)
        DO UPDATE SET
            name = EXCLUDED.name,
            auth_provider = 'google',
            google_sub = EXCLUDED.google_sub,
            avatar_url = EXCLUDED.avatar_url,
            role = ${role},
            locale = COALESCE(EXCLUDED.locale, users.locale),
            last_login_at = NOW(),
            updated_at = NOW()
        RETURNING id, name, email, role, locale, auth_provider, avatar_url, created_at
    `;

    session = await auth.createSession(sql, rows[0].id, {
        ip: http.getClientIp(req),
        userAgent: http.getUserAgent(req)
    });
    auth.setSessionCookie(res, session.token, session.expiresAt);
    clearOAuthCookies(res);
    renderPostAuthPage(res, next);
}

module.exports = async function(req, res) {
    var action = http.sanitize(req.query && req.query.action, 20) || 'config';

    if (req.method !== 'GET') {
        http.allowMethods(res, ['GET']);
        errors.jsonError(req, res, 405, 'Method not allowed');
        return;
    }

    try {
        if (action === 'start') {
            await handleStart(req, res);
            return;
        }

        if (action === 'callback') {
            await handleCallback(req, res);
            return;
        }

        await handleConfig(req, res);
    } catch (error) {
        clearOAuthCookies(res);
        if (action === 'callback') {
            http.redirect(res, '/login?error=google_failed', 302);
            return;
        }
        errors.handleApiError(req, res, error, 'Unable to continue with Google sign-in right now.', 500, 'auth.google');
    }
};
