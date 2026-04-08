var auth = require('../_lib/auth');
var db = require('../_lib/db');
var errors = require('../_lib/errors');
var http = require('../_lib/http');

module.exports = async function(req, res) {
    var sql;
    var session;
    var enrollments;
    var stats;

    if (req.method !== 'GET') {
        http.allowMethods(res, ['GET']);
        errors.jsonError(req, res, 405, 'Method not allowed');
        return;
    }

    try {
        sql = db.getSql();
        session = await auth.getSessionUser(sql, req);

        if (!session) {
            errors.jsonError(req, res, 401, 'Please sign in first.');
            return;
        }

        enrollments = await sql`
            WITH lesson_totals AS (
                SELECT
                    course_id,
                    COUNT(*)::int AS total_units
                FROM lessons
                GROUP BY course_id
            )
            SELECT
                enrollments.id,
                enrollments.course_id,
                enrollments.status,
                enrollments.progress_percent,
                enrollments.completed_lessons_count_snapshot,
                enrollments.enrolled_at,
                enrollments.last_activity_at,
                course_progress.completed_units,
                COALESCE(NULLIF(course_progress.total_units, 0), lesson_totals.total_units, 0) AS total_units,
                course_progress.current_module,
                course_progress.notes,
                course_progress.updated_at
            FROM enrollments
            LEFT JOIN course_progress
                ON course_progress.user_id = enrollments.user_id
               AND course_progress.course_id = enrollments.course_id
            LEFT JOIN lesson_totals
                ON lesson_totals.course_id = enrollments.course_id
            WHERE enrollments.user_id = ${session.user.id}
            ORDER BY enrollments.last_activity_at DESC NULLS LAST, enrollments.enrolled_at DESC
        `;

        stats = await sql`
            SELECT
                COUNT(*)::int AS enrollment_count,
                COALESCE(ROUND(AVG(progress_percent), 2), 0) AS avg_progress
            FROM enrollments
            WHERE user_id = ${session.user.id}
        `;

        http.jsonWithRequestId(req, res, 200, {
            ok: true,
            user: session.user,
            isAdmin: auth.isAdmin(session.user),
            stats: stats[0],
            enrollments: enrollments
        });
    } catch (error) {
        errors.handleApiError(req, res, error, 'Unable to load dashboard right now.', 500, 'learn.dashboard');
    }
};
