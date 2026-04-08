var auth = require('../_lib/auth');
var courseStore = require('../_lib/courseStore');
var db = require('../_lib/db');
var errors = require('../_lib/errors');
var http = require('../_lib/http');
var origin = require('../_lib/origin');

module.exports = async function(req, res) {
    var sql;
    var session;
    var body;
    var courseId;
    var lessonCountRows;
    var totalUnits;

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

        if (!session) {
            errors.jsonError(req, res, 401, 'Please sign in first.');
            return;
        }

        body = http.parseBody(req);
        courseId = http.sanitize(body.courseId, 80);

        if (!courseId) {
            errors.jsonError(req, res, 400, 'courseId is required.');
            return;
        }

        if (!(await courseStore.courseExists(sql, courseId))) {
            errors.jsonError(req, res, 404, 'Course not found.');
            return;
        }

        lessonCountRows = await sql`
            SELECT COUNT(*)::int AS total_count
            FROM lessons
            WHERE course_id = ${courseId}
        `;
        totalUnits = lessonCountRows[0] ? Number(lessonCountRows[0].total_count || 0) : 0;

        await sql`
            WITH upsert_enrollment AS (
                INSERT INTO enrollments (
                    user_id,
                    course_id,
                    status,
                    progress_percent,
                    last_activity_at
                )
                VALUES (
                    ${session.user.id},
                    ${courseId},
                    'active',
                    0,
                    NOW()
                )
                ON CONFLICT (user_id, course_id)
                DO UPDATE SET
                    status = 'active',
                    last_activity_at = NOW()
                RETURNING user_id, course_id
            )
            INSERT INTO course_progress (
                user_id,
                course_id,
                progress_percent,
                completed_units,
                total_units,
                current_module
            )
            SELECT
                user_id,
                course_id,
                0,
                0,
                ${totalUnits},
                NULL
            FROM upsert_enrollment
            ON CONFLICT (user_id, course_id)
            DO UPDATE SET
                total_units = GREATEST(course_progress.total_units, ${totalUnits}),
                updated_at = course_progress.updated_at
        `;

        http.jsonWithRequestId(req, res, 200, {
            ok: true,
            courseId: courseId
        });
    } catch (error) {
        errors.handleApiError(req, res, error, 'Unable to enroll right now.', 500, 'learn.enroll');
    }
};
