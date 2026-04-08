var auth = require('../_lib/auth');
var db = require('../_lib/db');
var errors = require('../_lib/errors');
var http = require('../_lib/http');
var origin = require('../_lib/origin');

var COMPLETION_THRESHOLD_RATIO = 0.8;

function clampNumber(value, minimum, maximum) {
    var number = Number(value);

    if (!isFinite(number)) {
        return minimum;
    }

    return Math.min(maximum, Math.max(minimum, number));
}

function calculateCompletionThreshold(durationSeconds) {
    var duration = Math.max(0, parseInt(durationSeconds, 10) || 0);

    if (!duration) {
        return 0;
    }

    return Math.ceil(duration * COMPLETION_THRESHOLD_RATIO);
}

function calculateProgressPercent(completedLessons, totalLessons) {
    var completed = Math.max(0, parseInt(completedLessons, 10) || 0);
    var total = Math.max(0, parseInt(totalLessons, 10) || 0);

    if (!total) {
        return 0;
    }

    return Math.round((completed / total) * 100);
}

async function ensureLearningProgressSchema(sql) {
    await sql`ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS max_position_seconds INT NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS last_position_seconds INT NOT NULL DEFAULT 0`;
}

async function ensureEnrollment(sql, userId, courseId) {
    var rows;

    await ensureLearningProgressSchema(sql);

    rows = await sql`
        INSERT INTO enrollments (
            user_id,
            course_id,
            status,
            progress_percent,
            completed_lessons_count_snapshot,
            last_activity_at
        )
        VALUES (
            ${userId},
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

    return rows[0] ? rows[0].id : null;
}

async function recomputeCourseProgress(sql, userId, courseId, enrollmentId) {
    var totalRows;
    var completedRows;
    var totalLessons;
    var completedLessons;
    var progressPercent;

    await ensureLearningProgressSchema(sql);

    totalRows = await sql`
        SELECT COUNT(*)::int AS total_count
        FROM lessons
        WHERE course_id = ${courseId}
    `;
    completedRows = await sql`
        SELECT COUNT(*)::int AS completed_count
        FROM lesson_progress
        WHERE enrollment_id = ${enrollmentId}
          AND status = 'completed'
    `;

    totalLessons = totalRows[0] ? Number(totalRows[0].total_count || 0) : 0;
    completedLessons = completedRows[0] ? Number(completedRows[0].completed_count || 0) : 0;
    progressPercent = calculateProgressPercent(completedLessons, totalLessons);

    await sql`
        UPDATE enrollments
        SET
            progress_percent = ${progressPercent},
            completed_lessons_count_snapshot = ${completedLessons},
            last_activity_at = NOW()
        WHERE id = ${enrollmentId}
    `;

    await sql`
        INSERT INTO course_progress (
            user_id,
            course_id,
            progress_percent,
            completed_units,
            total_units,
            updated_at
        )
        VALUES (
            ${userId},
            ${courseId},
            ${progressPercent},
            ${completedLessons},
            ${totalLessons},
            NOW()
        )
        ON CONFLICT (user_id, course_id)
        DO UPDATE SET
            progress_percent = ${progressPercent},
            completed_units = ${completedLessons},
            total_units = ${totalLessons},
            updated_at = NOW()
    `;

    return {
        completedLessons: completedLessons,
        totalLessons: totalLessons,
        progressPercent: progressPercent
    };
}

function mapLessonProgressRow(row) {
    var durationSeconds = Math.max(0, parseInt(row.duration_seconds, 10) || 0);
    var maxPositionSeconds = Math.max(0, parseInt(row.max_position_seconds, 10) || 0);
    var lastPositionSeconds = Math.max(0, parseInt(row.last_position_seconds, 10) || 0);
    var thresholdSeconds = calculateCompletionThreshold(durationSeconds);

    return {
        lessonId: row.lesson_id,
        status: row.status || 'not_started',
        completed: row.status === 'completed',
        progressPercent: clampNumber(row.progress_percent || 0, 0, 100),
        timeSpentSeconds: Math.max(0, parseInt(row.time_spent_seconds, 10) || 0),
        maxPositionSeconds: maxPositionSeconds,
        lastPositionSeconds: lastPositionSeconds,
        durationSeconds: durationSeconds,
        thresholdSeconds: thresholdSeconds,
        completionEligible: thresholdSeconds > 0 && maxPositionSeconds >= thresholdSeconds,
        completedAt: row.completed_at || null,
        updatedAt: row.updated_at || null
    };
}

async function getCourseProgressSnapshot(sql, userId, courseId) {
    var totalRows;
    var enrollmentRows;
    var totalLessons;
    var enrollment;
    var lessonRows;
    var lessonProgressById;
    var completedLessons;
    var progressPercent;

    await ensureLearningProgressSchema(sql);

    totalRows = await sql`
        SELECT COUNT(*)::int AS total_count
        FROM lessons
        WHERE course_id = ${courseId}
    `;
    enrollmentRows = await sql`
        SELECT id, progress_percent, completed_lessons_count_snapshot, last_activity_at
        FROM enrollments
        WHERE user_id = ${userId}
          AND course_id = ${courseId}
        LIMIT 1
    `;

    totalLessons = totalRows[0] ? Number(totalRows[0].total_count || 0) : 0;
    enrollment = enrollmentRows[0] || null;
    lessonRows = enrollment ? await sql`
        SELECT
            lesson_id,
            status,
            progress_percent,
            time_spent_seconds,
            max_position_seconds,
            last_position_seconds,
            completed_at,
            updated_at,
            lessons.duration_seconds
        FROM lesson_progress
        INNER JOIN lessons ON lessons.id = lesson_progress.lesson_id
        WHERE enrollment_id = ${enrollment.id}
    ` : [];
    lessonProgressById = {};

    lessonRows.forEach(function(row) {
        lessonProgressById[row.lesson_id] = mapLessonProgressRow(row);
    });

    completedLessons = enrollment ? Number(enrollment.completed_lessons_count_snapshot || 0) : 0;
    progressPercent = enrollment ? calculateProgressPercent(completedLessons, totalLessons) : 0;

    return {
        enrollmentId: enrollment ? enrollment.id : null,
        summary: {
            completedLessons: completedLessons,
            totalLessons: totalLessons,
            progressPercent: progressPercent,
            lastActivityAt: enrollment ? enrollment.last_activity_at : null
        },
        lessonProgressById: lessonProgressById
    };
}

async function listUserCourseProgress(sql, userId) {
    var rows;

    rows = await sql`
        WITH lesson_totals AS (
            SELECT
                course_id,
                COUNT(*)::int AS total_lessons
            FROM lessons
            GROUP BY course_id
        )
        SELECT
            enrollments.course_id,
            enrollments.last_activity_at,
            enrollments.completed_lessons_count_snapshot AS completed_lessons,
            COALESCE(lesson_totals.total_lessons, 0) AS total_lessons
        FROM enrollments
        LEFT JOIN lesson_totals
          ON lesson_totals.course_id = enrollments.course_id
        WHERE enrollments.user_id = ${userId}
        ORDER BY enrollments.last_activity_at DESC NULLS LAST, enrollments.enrolled_at DESC
    `;

    return rows.map(function(row) {
        var totalLessons = Number(row.total_lessons || 0);
        var completedLessons = Number(row.completed_lessons || 0);

        return {
            courseId: row.course_id,
            completedLessons: completedLessons,
            totalLessons: totalLessons,
            progressPercent: calculateProgressPercent(completedLessons, totalLessons),
            lastActivityAt: row.last_activity_at || null
        };
    });
}

async function syncLessonPlayback(sql, userId, courseId, lessonId, payload) {
    var lessonRows;
    var enrollmentId;
    var currentPositionSeconds;
    var providedDurationSeconds;
    var existingDurationSeconds;
    var durationSeconds;
    var existingRows;
    var existing;
    var maxPositionSeconds;
    var thresholdSeconds;
    var completionEligible;
    var lessonStatus;
    var playbackPercent;
    var summary;

    await ensureLearningProgressSchema(sql);

    lessonRows = await sql`
        SELECT id, duration_seconds
        FROM lessons
        WHERE id = ${lessonId}
          AND course_id = ${courseId}
        LIMIT 1
    `;

    if (!lessonRows.length) {
        throw new Error('Lesson not found.');
    }

    enrollmentId = await ensureEnrollment(sql, userId, courseId);
    currentPositionSeconds = Math.max(0, Math.floor(Number(payload.currentPositionSeconds) || 0));
    providedDurationSeconds = Math.max(0, Math.floor(Number(payload.durationSeconds) || 0));
    existingDurationSeconds = Math.max(0, parseInt(lessonRows[0].duration_seconds, 10) || 0);
    durationSeconds = providedDurationSeconds || existingDurationSeconds;

    if (providedDurationSeconds && (!existingDurationSeconds || existingDurationSeconds !== providedDurationSeconds)) {
        await sql`
            UPDATE lessons
            SET duration_seconds = ${providedDurationSeconds}
            WHERE id = ${lessonId}
        `;
    }

    existingRows = await sql`
        SELECT status, progress_percent, time_spent_seconds, max_position_seconds, last_position_seconds, completed_at
        FROM lesson_progress
        WHERE enrollment_id = ${enrollmentId}
          AND lesson_id = ${lessonId}
        LIMIT 1
    `;
    existing = existingRows[0] || null;
    maxPositionSeconds = Math.max(
        currentPositionSeconds,
        existing ? Number(existing.max_position_seconds || 0) : 0
    );
    thresholdSeconds = calculateCompletionThreshold(durationSeconds);
    completionEligible = thresholdSeconds > 0 && maxPositionSeconds >= thresholdSeconds;
    lessonStatus = existing && existing.status === 'completed'
        ? 'completed'
        : (maxPositionSeconds > 0 ? 'in_progress' : 'not_started');
    playbackPercent = durationSeconds
        ? clampNumber(Math.round((maxPositionSeconds / durationSeconds) * 100), 0, 100)
        : 0;

    await sql`
        INSERT INTO lesson_progress (
            enrollment_id,
            lesson_id,
            status,
            progress_percent,
            time_spent_seconds,
            max_position_seconds,
            last_position_seconds,
            started_at,
            completed_at,
            last_viewed_at,
            updated_at
        )
        VALUES (
            ${enrollmentId},
            ${lessonId},
            ${lessonStatus},
            ${playbackPercent},
            0,
            ${maxPositionSeconds},
            ${currentPositionSeconds},
            ${maxPositionSeconds > 0 ? new Date().toISOString() : null},
            ${existing && existing.completed_at ? existing.completed_at : null},
            NOW(),
            NOW()
        )
        ON CONFLICT (enrollment_id, lesson_id)
        DO UPDATE SET
            status = CASE
                WHEN lesson_progress.status = 'completed' THEN 'completed'
                WHEN ${maxPositionSeconds} > 0 THEN 'in_progress'
                ELSE 'not_started'
            END,
            progress_percent = CASE
                WHEN lesson_progress.status = 'completed' THEN 100
                ELSE ${playbackPercent}
            END,
            max_position_seconds = GREATEST(lesson_progress.max_position_seconds, ${maxPositionSeconds}),
            last_position_seconds = ${currentPositionSeconds},
            last_viewed_at = NOW(),
            updated_at = NOW(),
            started_at = COALESCE(lesson_progress.started_at, ${maxPositionSeconds > 0 ? new Date().toISOString() : null})
    `;

    summary = await recomputeCourseProgress(sql, userId, courseId, enrollmentId);

    return {
        enrollmentId: enrollmentId,
        summary: summary,
        lessonProgress: {
            lessonId: lessonId,
            status: lessonStatus,
            completed: existing && existing.status === 'completed',
            progressPercent: existing && existing.status === 'completed' ? 100 : playbackPercent,
            maxPositionSeconds: maxPositionSeconds,
            lastPositionSeconds: currentPositionSeconds,
            durationSeconds: durationSeconds,
            thresholdSeconds: thresholdSeconds,
            completionEligible: completionEligible
        }
    };
}

async function markLessonCompleted(sql, userId, courseId, lessonId) {
    var lessonRows;
    var enrollmentId;
    var progressRows;
    var currentProgress;
    var durationSeconds;
    var thresholdSeconds;
    var maxPositionSeconds;
    var summary;

    await ensureLearningProgressSchema(sql);

    lessonRows = await sql`
        SELECT id, duration_seconds
        FROM lessons
        WHERE id = ${lessonId}
          AND course_id = ${courseId}
        LIMIT 1
    `;

    if (!lessonRows.length) {
        throw new Error('Lesson not found.');
    }

    enrollmentId = await ensureEnrollment(sql, userId, courseId);
    progressRows = await sql`
        SELECT max_position_seconds, last_position_seconds, completed_at
        FROM lesson_progress
        WHERE enrollment_id = ${enrollmentId}
          AND lesson_id = ${lessonId}
        LIMIT 1
    `;
    currentProgress = progressRows[0] || null;
    durationSeconds = Math.max(0, parseInt(lessonRows[0].duration_seconds, 10) || 0);
    thresholdSeconds = calculateCompletionThreshold(durationSeconds);
    maxPositionSeconds = Math.max(0, parseInt(currentProgress ? currentProgress.max_position_seconds : 0, 10) || 0);

    if (!thresholdSeconds || maxPositionSeconds < thresholdSeconds) {
        throw new Error('This video must reach at least 80% playback before it can be marked complete.');
    }

    await sql`
        INSERT INTO lesson_progress (
            enrollment_id,
            lesson_id,
            status,
            progress_percent,
            time_spent_seconds,
            max_position_seconds,
            last_position_seconds,
            started_at,
            completed_at,
            last_viewed_at,
            updated_at
        )
        VALUES (
            ${enrollmentId},
            ${lessonId},
            'completed',
            100,
            0,
            ${maxPositionSeconds},
            ${Math.max(0, parseInt(currentProgress ? currentProgress.last_position_seconds : 0, 10) || 0)},
            NOW(),
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (enrollment_id, lesson_id)
        DO UPDATE SET
            status = 'completed',
            progress_percent = 100,
            max_position_seconds = GREATEST(lesson_progress.max_position_seconds, ${maxPositionSeconds}),
            completed_at = COALESCE(lesson_progress.completed_at, NOW()),
            last_viewed_at = NOW(),
            updated_at = NOW()
    `;

    summary = await recomputeCourseProgress(sql, userId, courseId, enrollmentId);

    return {
        enrollmentId: enrollmentId,
        summary: summary,
        lessonProgress: {
            lessonId: lessonId,
            status: 'completed',
            completed: true,
            progressPercent: 100,
            maxPositionSeconds: maxPositionSeconds,
            lastPositionSeconds: Math.max(0, parseInt(currentProgress ? currentProgress.last_position_seconds : 0, 10) || 0),
            durationSeconds: durationSeconds,
            thresholdSeconds: thresholdSeconds,
            completionEligible: true
        }
    };
}

module.exports = async function(req, res) {
    var sql;
    var session;
    var courseId;
    var lessonId;
    var body;
    var result;

    try {
        sql = db.getSql();
        session = await auth.getSessionUser(sql, req);

        if (!session) {
            errors.jsonError(req, res, 401, 'Please sign in first.');
            return;
        }

        if (req.method === 'GET') {
            courseId = http.sanitize(req.query && req.query.courseId, 80);

            if (!courseId) {
                http.jsonWithRequestId(req, res, 200, {
                    ok: true,
                    items: await listUserCourseProgress(sql, session.user.id)
                });
                return;
            }

            result = await getCourseProgressSnapshot(sql, session.user.id, courseId);

            http.jsonWithRequestId(req, res, 200, {
                ok: true,
                courseId: courseId,
                enrollmentId: result.enrollmentId,
                summary: result.summary,
                lessonProgressById: result.lessonProgressById
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
        lessonId = parseInt(body.lessonId, 10) || 0;

        if (!courseId || !lessonId) {
            errors.jsonError(req, res, 400, 'courseId and lessonId are required.');
            return;
        }

        result = body.action === 'mark_complete'
            ? await markLessonCompleted(sql, session.user.id, courseId, lessonId)
            : await syncLessonPlayback(sql, session.user.id, courseId, lessonId, body);

        http.jsonWithRequestId(req, res, 200, {
            ok: true,
            courseId: courseId,
            enrollmentId: result.enrollmentId,
            summary: result.summary,
            lessonProgress: result.lessonProgress
        });
    } catch (error) {
        errors.handleApiError(req, res, error, error.message || 'Unable to update progress.', 500, 'learn.progress');
    }
};
