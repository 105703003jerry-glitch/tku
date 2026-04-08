var auth = require('../_lib/auth');
var db = require('../_lib/db');
var errors = require('../_lib/errors');
var http = require('../_lib/http');
var origin = require('../_lib/origin');

module.exports = async function(req, res) {
    var session;
    var sql;

    if (req.method !== 'POST') {
        http.allowMethods(res, ['POST']);
        errors.jsonError(req, res, 405, 'Method not allowed');
        return;
    }

    if (!origin.requireTrustedOrigin(req, res, errors)) {
        return;
    }

    try {
        sql = db.getSql();
        session = await auth.getSessionUser(sql, req);
        if (session && session.token) {
            await auth.destroySession(sql, session.token);
        }
        auth.clearSessionCookie(res);
        http.jsonWithRequestId(req, res, 200, { ok: true });
    } catch (error) {
        errors.handleApiError(req, res, error, 'Unable to sign out right now.', 500, 'auth.logout');
    }
};
