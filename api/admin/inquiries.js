var auth = require('../_lib/auth');
var db = require('../_lib/db');
var errors = require('../_lib/errors');
var http = require('../_lib/http');

module.exports = async function(req, res) {
    var sql;
    var session;
    var limit;
    var rows;

    if (req.method !== 'GET') {
        http.allowMethods(res, ['GET']);
        errors.jsonError(req, res, 405, 'Method not allowed');
        return;
    }

    try {
        sql = db.getSql();
        session = await auth.getSessionUser(sql, req);

        if (!session || !auth.isAdmin(session.user)) {
            errors.jsonError(req, res, 403, 'Admin access required.');
            return;
        }

        limit = Math.min(200, Math.max(1, parseInt((req.query && req.query.limit) || '50', 10) || 50));
        rows = await sql`
            SELECT
                id,
                name,
                email,
                organization,
                country,
                interest,
                message,
                locale,
                source_page,
                created_at
            FROM inquiries
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;

        http.jsonWithRequestId(req, res, 200, {
            ok: true,
            items: rows
        });
    } catch (error) {
        errors.handleApiError(req, res, error, 'Unable to load inquiries right now.', 500, 'admin.inquiries.list');
    }
};
