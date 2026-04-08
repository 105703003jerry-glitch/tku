var auth = require('../_lib/auth');
var db = require('../_lib/db');
var errors = require('../_lib/errors');
var http = require('../_lib/http');

module.exports = async function(req, res) {
    var sql;
    var session;

    http.noStore(res);
    res.setHeader('Vary', 'Cookie');

    if (req.method !== 'GET') {
        http.allowMethods(res, ['GET']);
        errors.jsonError(req, res, 405, 'Method not allowed');
        return;
    }

    try {
        sql = db.getSql();
        session = await auth.getSessionUser(sql, req);
        http.jsonWithRequestId(req, res, 200, {
            ok: true,
            user: session ? session.user : null
        });
    } catch (error) {
        errors.handleApiError(req, res, error, 'Unable to load session right now.', 500, 'auth.me');
    }
};
