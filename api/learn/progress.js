var auth = require('../_lib/auth');
var courseStore = require('../_lib/courseStore');
var db = require('../_lib/db');
var errors = require('../_lib/errors');
var http = require('../_lib/http');
var origin = require('../_lib/origin');

function normalizeProgress(value) {
    var number = Number(value);

    if (!isFinite(number)) {
        return 0;
    }

    if (number < 0) {
        return 0;
    }

    if (number > 100) {
        return 100;
    }

    return Math.round(number * 100) / 100;
}

function normalizeLessonStatus(value) {
    var status = http.sanitize(value, 20);
    var allowed = {
        not_started: true,
        in_progress: true,
        completed: true
    };

    return allowed[status] ? status : 'in_progress';
}

async function getCourseLessonSummary(sql, userId, courseId) {
    var totalRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM lessons
        WHERE course_id = ${courseId}
    `;
    var enrollmentRows = await sql`
        SELECT
            enrollments.id,
            enrollments.progress_percent,
            enrollments.completed_lessons_count_snapshot,
            course_progress.current_module,
            course_progress.notes
        FROM enrollments
        LEFT JOIN course_progress
            ON course_progress.user_id = enrollments.user_id
           AND course_progress.course_id = enrollments.course_id
        WHERE enrollments.user_id = ${userId}
          AND enrollments.course_id = ${courseId}
        LIMIT 1
    `;
    var totalLessons = totalRows[0] ? Number(totalRows[0].count || 0) : 0;
    var enrollment = enrollmentRows[0] || null;

    return {
        enrollmentId: enrollment ? enrollment.id : null,
        completedLessons: enrollment ? Number(enrollment.completed_lessons_count_snapshot || 0) : 0,
        totalLessons: totalLessons,
        progressPercent: enrollment ? Number(enrollment.progress_percent || 0) : 0,
        currentModule: enrollment ? enrollment.current_module : null,
        notes: enrollment ? enrollment.notes : null
    };
}

module.exports = async function(req, res) {
    var sql;
    var session;
    var body;
    var courseId;
    var progressPercent;
    var completedUnits;
    var totalUnits;
    var currentModule;
    var notes;
    var rows;
    var summary;
    var lessonId;
    var lessonRows;
    var lessonStatus;
    var lessonProgressPercent;
    var timeSpentSeconds;
    var eventType;
    var enrollmentRows;
    var completedCountRows;

    try {
        sql = db.getSql();
        session = await auth.getSessionUser(sql, req);

        if (!session) {
            errors.jsonError(req, res, 401, 'Please sign in first.');
            return;
        }

        courseId = http.sanitize(req.query && req.query.courseId, 80);

        if (req.method === 'GET') {
            if (!courseId) {
                rows = await sql`
                    SELECT
                        course_id,
                        progress_percent,
                        completed_units,
                        total_units,
                        current_module,
                        notes,
                        updated_at
                    FROM course_progress
                    WHERE user_id = ${session.user.id}
                    ORDER BY updated_at DESC
                `;

                http.jsonWithRequestId(req, res, 200, {
                    ok: true,
                    items: rows
                });
                return;
            }

            if (!(await courseStore.courseExists(sql, courseId))) {
                errors.jsonError(req, res, 404, 'Course not found.');
                return;
            }

            summary = await getCourseLessonSummary(sql, session.user.id, courseId);
            rows = await sql`
                SELECT
                    lessons.id,
                    lessons.module_sort_order,
                    lessons.lesson_sort_order,
                    lessons.title,
                    lessons.lesson_type,
                    lessons.content_url,
                    lessons.external_video_id,
                    lessons.thumbnail_url,
                    lessons.duration_seconds,
                    lesson_progress.status,
                    lesson_progress.progress_percent,
                    lesson_progress.time_spent_seconds,
                    lesson_progress.last_viewed_at,
                    lesson_progress.completed_at
                FROM lessons
                LEFT JOIN lesson_progress
                    ON lesson_progress.lesson_id = lessons.id
                   AND lesson_progress.enrollment_id = ${summary.enrollmentId || -1}
                WHERE lessons.course_id = ${courseId}
                ORDER BY lessons.module_sort_order ASC, lessons.lesson_sort_order ASC
            `;

            http.jsonWithRequestId(req, res, 200, {
                ok: true,
                courseId: courseId,
                summary: summary,
                lessons: rows
            });
            return;
        }

        if (req.method !== 'POST') {
            http.allowMethods(res, ['GET', 'POST']);
            errors.jsonError(req, res, 405, 'Method not allowed');
            return;
        }

        if (!origin.requireTrustedOrigin(req, res, errors)) {
            return;
        }

        body = http.parseBody(req);
        courseId = http.sanitize(body.courseId, 80);
        notes = http.sanitize(body.notes, 1000) || null;

        if (!courseId) {
            errors.jsonError(req, res, 400, 'courseId is required.');
            return;
        }

        if (!(await courseStore.courseExists(sql, courseId))) {
            errors.jsonError(req, res, 404, 'Course not found.');
            return;
        }

        lessonId = parseInt(body.lessonId, 10) || 0;

        if (lessonId) {
            lessonRows = await sql`
                SELECT id, title
                FROM lessons
                WHERE id = ${lessonId}
                  AND course_id = ${courseId}
                LIMIT 1
            `;

            if (!lessonRows.length) {
                errors.jsonError(req, res, 404, 'Lesson not found.');
                return;
            }

            lessonStatus = normalizeLessonStatus(body.lessonStatus);
            lessonProgressPercent = normalizeProgress(body.lessonProgressPercent);
            timeSpentSeconds = Math.max(0, parseInt(body.timeSpentSeconds, 10) || 0);
            eventType = http.sanitize(body.eventType, 40) || 'lesson_progress_updated';

            if (!lessonProgressPercent) {
                lessonProgressPercent = lessonStatus === 'completed' ? 100 : (lessonStatus === 'in_progress' ? 50 : 0);
            }

            enrollmentRows = await sql`
                INSERT INTO enrollments (
                    user_id,
                    course_id,
                    status,
                    progress_percent,
                    completed_lessons_count_snapshot,
                    last_activity_at
                )
                VALUES (
                    ${session.user.id},
                    ${courseId},
                    'active',
                    0,
                    0,
                    NOW()
                )
                ON CONFLICT (user_id, course_id)
                DO UPDATE SET
                    status = 'active',
                    last_activity_at = NOW()
                RETURNING id
            `;

            await sql`
                INSERT INTO lesson_progress (
                    enrollment_id,
                    lesson_id,
                    status,
                    progress_percent,
                    time_spent_seconds,
                    started_at,
                    completed_at,
                    last_viewed_at,
                    updated_at
                )
                VALUES (
                    ${enrollmentRows[0].id},
                    ${lessonId},
                    ${lessonStatus},
                    ${lessonProgressPercent},
                    ${timeSpentSeconds},
                    ${lessonStatus === 'not_started' ? null : new Date().toISOString()},
                    ${lessonStatus === 'completed' ? new Date().toISOString() : null},
                    NOW(),
                    NOW()
                )
                ON CONFLICT (enrollment_id, lesson_id)
                DO UPDATE SET
                    status = ${lessonStatus},
                    progress_percent = ${lessonProgressPercent},
                    time_spent_seconds = lesson_progress.time_spent_seconds + ${timeSpentSeconds},
                    started_at = COALESCE(lesson_progress.started_at, ${lessonStatus === 'not_started' ? null : new Date().toISOString()}),
                    completed_at = CASE
                        WHEN ${lessonStatus} = 'completed' THEN COALESCE(lesson_progress.completed_at, NOW())
                        ELSE lesson_progress.completed_at
                    END,
                    last_viewed_at = NOW(),
                    updated_at = NOW()
            `;

            await sql`
                INSERT INTO activity_events (
                    user_id,
                    course_id,
                    lesson_id,
                    event_type,
                    payload_json
                )
                VALUES (
                    ${session.user.id},
                    ${courseId},
                    ${lessonId},
                    ${eventType},
                    ${JSON.stringify({
                        status: lessonStatus,
                        progressPercent: lessonProgressPercent,
                        timeSpentSeconds: timeSpentSeconds
                    })}
                )
            `;

            completedCountRows = await sql`
                SELECT
                    COUNT(*)::int AS completed_count
                FROM lesson_progress
                WHERE enrollment_id = ${enrollmentRows[0].id}
                  AND status = 'completed'
            `;
            totalUnits = (await sql`
                SELECT COUNT(*)::int AS total_count
                FROM lessons
                WHERE course_id = ${courseId}
            `)[0].total_count;
            completedUnits = completedCountRows[0] ? Number(completedCountRows[0].completed_count || 0) : 0;
            progressPercent = totalUnits ? Math.round((completedUnits / Number(totalUnits)) * 10000) / 100 : 0;
            currentModule = lessonRows[0].title;

            await sql`
                UPDATE enrollments
                SET progress_percent = ${progressPercent},
                    completed_lessons_count_snapshot = ${completedUnits},
                    last_activity_at = NOW()
                WHERE id = ${enrollmentRows[0].id}
            `;

            await sql`
                INSERT INTO course_progress (
                    user_id,
                    course_id,
                    progress_percent,
                    completed_units,
                    total_units,
                    current_module,
                    notes,
                    updated_at
                )
                VALUES (
                    ${session.user.id},
                    ${courseId},
                    ${progressPercent},
                    ${completedUnits},
                    ${totalUnits},
                    ${currentModule},
                    ${notes},
                    NOW()
                )
                ON CONFLICT (user_id, course_id)
                DO UPDATE SET
                    progress_percent = ${progressPercent},
                    completed_units = ${completedUnits},
                    total_units = ${totalUnits},
                    current_module = ${currentModule},
                    notes = COALESCE(${notes}, course_progress.notes),
                    updated_at = NOW()
            `;

            http.jsonWithRequestId(req, res, 200, {
                ok: true,
                courseId: courseId,
                lessonId: lessonId,
                lessonStatus: lessonStatus,
                progressPercent: progressPercent,
                completedUnits: completedUnits,
                totalUnits: totalUnits
            });
            return;
        }

        progressPercent = normalizeProgress(body.progressPercent);
        completedUnits = Math.max(0, parseInt(body.completedUnits, 10) || 0);
        totalUnits = Math.max(0, parseInt(body.totalUnits, 10) || 0);
        currentModule = http.sanitize(body.currentModule, 160) || null;

        await sql`
            WITH upsert_enrollment AS (
                INSERT INTO enrollments (
                    user_id,
                    course_id,
                    status,
                    progress_percent,
                    completed_lessons_count_snapshot,
                    last_activity_at
                )
                VALUES (
                    ${session.user.id},
                    ${courseId},
                    'active',
                    ${progressPercent},
                    ${completedUnits},
                    NOW()
                )
                ON CONFLICT (user_id, course_id)
                DO UPDATE SET
                    progress_percent = ${progressPercent},
                    completed_lessons_count_snapshot = ${completedUnits},
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
                current_module,
                notes,
                updated_at
            )
            SELECT
                user_id,
                course_id,
                ${progressPercent},
                ${completedUnits},
                ${totalUnits},
                ${currentModule},
                ${notes},
                NOW()
            FROM upsert_enrollment
            ON CONFLICT (user_id, course_id)
            DO UPDATE SET
                progress_percent = ${progressPercent},
                completed_units = ${completedUnits},
                total_units = ${totalUnits},
                current_module = ${currentModule},
                notes = ${notes},
                updated_at = NOW()
        `;

        http.jsonWithRequestId(req, res, 200, {
            ok: true,
            courseId: courseId,
            progressPercent: progressPercent
        });
    } catch (error) {
        errors.handleApiError(req, res, error, 'Unable to update progress right now.', 500, 'learn.progress');
    }
};
