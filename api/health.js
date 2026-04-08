var db = require('./_lib/db');
var errors = require('./_lib/errors');
var http = require('./_lib/http');

module.exports = async function(req, res) {
    var mode = (req.query && req.query.mode) || 'live';
    var sql;
    var checks;

    if (mode === 'ready') {
        checks = {
            database: false,
            resend: Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_NOTIFY_EMAIL),
            openai: Boolean(process.env.OPENAI_API_KEY)
        };

        try {
            sql = db.getSql();
            await sql`SELECT 1 AS ok`;
            checks.database = true;

            http.jsonWithRequestId(req, res, 200, {
                ok: true,
                service: 'tkclclab-production-api',
                mode: 'ready',
                checks: checks
            });
            return;
        } catch (error) {
            errors.handleApiError(req, res, error, 'Service readiness checks failed.', 503, 'health.ready');
            return;
        }
    }

    http.jsonWithRequestId(req, res, 200, {
        ok: true,
        service: 'tkclclab-production-api',
        mode: 'live'
    });
};
