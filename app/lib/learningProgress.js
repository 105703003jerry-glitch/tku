const COMPLETION_THRESHOLD_RATIO = 0.8;

let progressSchemaReadyPromise = null;

function clampNumber(value, minimum, maximum) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, number));
}

export function calculateCompletionThreshold(durationSeconds) {
  const duration = Math.max(0, Number.parseInt(durationSeconds, 10) || 0);

  if (!duration) {
    return 0;
  }

  return Math.ceil(duration * COMPLETION_THRESHOLD_RATIO);
}

export function calculateProgressPercent(completedLessons, totalLessons) {
  const completed = Math.max(0, Number.parseInt(completedLessons, 10) || 0);
  const total = Math.max(0, Number.parseInt(totalLessons, 10) || 0);

  if (!total) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

export async function ensureLearningProgressSchema(sql) {
  if (!progressSchemaReadyPromise) {
    progressSchemaReadyPromise = (async () => {
      await sql`ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS max_position_seconds INT NOT NULL DEFAULT 0`;
      await sql`ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS last_position_seconds INT NOT NULL DEFAULT 0`;
    })().catch((error) => {
      progressSchemaReadyPromise = null;
      throw error;
    });
  }

  await progressSchemaReadyPromise;
}

export async function ensureEnrollment(sql, userId, courseId) {
  await ensureLearningProgressSchema(sql);

  const enrollmentRows = await sql`
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

  return enrollmentRows[0]?.id || null;
}

export async function recomputeCourseProgress(sql, userId, courseId, enrollmentId) {
  await ensureLearningProgressSchema(sql);

  const totalRows = await sql`
    SELECT COUNT(*)::int AS total_count
    FROM lessons
    WHERE course_id = ${courseId}
  `;
  const completedRows = await sql`
    SELECT COUNT(*)::int AS completed_count
    FROM lesson_progress
    WHERE enrollment_id = ${enrollmentId}
      AND status = 'completed'
  `;

  const totalLessons = totalRows[0] ? Number(totalRows[0].total_count || 0) : 0;
  const completedLessons = completedRows[0] ? Number(completedRows[0].completed_count || 0) : 0;
  const progressPercent = calculateProgressPercent(completedLessons, totalLessons);

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
    completedLessons,
    totalLessons,
    progressPercent,
  };
}

function mapLessonProgressRow(row) {
  const durationSeconds = Math.max(0, Number.parseInt(row.duration_seconds, 10) || 0);
  const maxPositionSeconds = Math.max(0, Number.parseInt(row.max_position_seconds, 10) || 0);
  const lastPositionSeconds = Math.max(0, Number.parseInt(row.last_position_seconds, 10) || 0);
  const thresholdSeconds = calculateCompletionThreshold(durationSeconds);
  const completionEligible = thresholdSeconds > 0 && maxPositionSeconds >= thresholdSeconds;

  return {
    lessonId: row.lesson_id,
    status: row.status || 'not_started',
    completed: row.status === 'completed',
    progressPercent: clampNumber(row.progress_percent || 0, 0, 100),
    timeSpentSeconds: Math.max(0, Number.parseInt(row.time_spent_seconds, 10) || 0),
    maxPositionSeconds,
    lastPositionSeconds,
    durationSeconds,
    thresholdSeconds,
    completionEligible,
    completedAt: row.completed_at || null,
    updatedAt: row.updated_at || null,
  };
}

export async function getCourseProgressSnapshot(sql, userId, courseId) {
  await ensureLearningProgressSchema(sql);

  const totalRows = await sql`
    SELECT COUNT(*)::int AS total_count
    FROM lessons
    WHERE course_id = ${courseId}
  `;
  const enrollmentRows = await sql`
    SELECT id, progress_percent, completed_lessons_count_snapshot, last_activity_at
    FROM enrollments
    WHERE user_id = ${userId}
      AND course_id = ${courseId}
    LIMIT 1
  `;

  const totalLessons = totalRows[0] ? Number(totalRows[0].total_count || 0) : 0;
  const enrollment = enrollmentRows[0] || null;
  const lessonRows = enrollment ? await sql`
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

  const lessonProgressById = {};
  lessonRows.forEach((row) => {
    lessonProgressById[row.lesson_id] = mapLessonProgressRow(row);
  });

  const completedLessons = enrollment
    ? Number(enrollment.completed_lessons_count_snapshot || 0)
    : 0;
  const progressPercent = enrollment
    ? calculateProgressPercent(completedLessons, totalLessons)
    : 0;

  return {
    enrollmentId: enrollment?.id || null,
    summary: {
      completedLessons,
      totalLessons,
      progressPercent,
      lastActivityAt: enrollment?.last_activity_at || null,
    },
    lessonProgressById,
  };
}

export async function listUserCourseProgress(sql, userId) {
  await ensureLearningProgressSchema(sql);

  const rows = await sql`
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

  return rows.map((row) => {
    const totalLessons = Number(row.total_lessons || 0);
    const completedLessons = Number(row.completed_lessons || 0);

    return {
      courseId: row.course_id,
      completedLessons,
      totalLessons,
      progressPercent: calculateProgressPercent(completedLessons, totalLessons),
      lastActivityAt: row.last_activity_at || null,
    };
  });
}

export async function syncLessonPlayback(sql, userId, courseId, lessonId, payload) {
  await ensureLearningProgressSchema(sql);

  const lessonRows = await sql`
    SELECT id, duration_seconds, title
    FROM lessons
    WHERE id = ${lessonId}
      AND course_id = ${courseId}
    LIMIT 1
  `;

  if (!lessonRows.length) {
    throw new Error('Lesson not found.');
  }

  const enrollmentId = await ensureEnrollment(sql, userId, courseId);
  const currentPositionSeconds = Math.max(0, Math.floor(Number(payload.currentPositionSeconds) || 0));
  const providedDurationSeconds = Math.max(0, Math.floor(Number(payload.durationSeconds) || 0));
  const existingDurationSeconds = Math.max(0, Number.parseInt(lessonRows[0].duration_seconds, 10) || 0);
  const durationSeconds = providedDurationSeconds || existingDurationSeconds;

  if (providedDurationSeconds && (!existingDurationSeconds || existingDurationSeconds !== providedDurationSeconds)) {
    await sql`
      UPDATE lessons
      SET duration_seconds = ${providedDurationSeconds}
      WHERE id = ${lessonId}
    `;
  }

  const existingRows = await sql`
    SELECT status, progress_percent, time_spent_seconds, max_position_seconds, last_position_seconds, completed_at
    FROM lesson_progress
    WHERE enrollment_id = ${enrollmentId}
      AND lesson_id = ${lessonId}
    LIMIT 1
  `;
  const existing = existingRows[0] || null;
  const maxPositionSeconds = Math.max(
    currentPositionSeconds,
    existing ? Number(existing.max_position_seconds || 0) : 0
  );
  const thresholdSeconds = calculateCompletionThreshold(durationSeconds);
  const completionEligible = thresholdSeconds > 0 && maxPositionSeconds >= thresholdSeconds;
  const lessonStatus = existing?.status === 'completed'
    ? 'completed'
    : (maxPositionSeconds > 0 ? 'in_progress' : 'not_started');
  const playbackPercent = durationSeconds
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
      ${existing?.completed_at || null},
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

  const summary = await recomputeCourseProgress(sql, userId, courseId, enrollmentId);

  return {
    enrollmentId,
    summary,
    lessonProgress: {
      lessonId,
      status: lessonStatus,
      completed: existing?.status === 'completed',
      progressPercent: existing?.status === 'completed' ? 100 : playbackPercent,
      maxPositionSeconds,
      lastPositionSeconds: currentPositionSeconds,
      durationSeconds,
      thresholdSeconds,
      completionEligible,
    },
  };
}

export async function markLessonCompleted(sql, userId, courseId, lessonId) {
  await ensureLearningProgressSchema(sql);

  const lessonRows = await sql`
    SELECT id, duration_seconds
    FROM lessons
    WHERE id = ${lessonId}
      AND course_id = ${courseId}
    LIMIT 1
  `;

  if (!lessonRows.length) {
    throw new Error('Lesson not found.');
  }

  const enrollmentId = await ensureEnrollment(sql, userId, courseId);
  const progressRows = await sql`
    SELECT max_position_seconds, last_position_seconds, completed_at
    FROM lesson_progress
    WHERE enrollment_id = ${enrollmentId}
      AND lesson_id = ${lessonId}
    LIMIT 1
  `;
  const currentProgress = progressRows[0] || null;
  const durationSeconds = Math.max(0, Number.parseInt(lessonRows[0].duration_seconds, 10) || 0);
  const thresholdSeconds = calculateCompletionThreshold(durationSeconds);
  const maxPositionSeconds = Math.max(0, Number.parseInt(currentProgress?.max_position_seconds, 10) || 0);

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
      ${Math.max(0, Number.parseInt(currentProgress?.last_position_seconds, 10) || 0)},
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

  const summary = await recomputeCourseProgress(sql, userId, courseId, enrollmentId);

  return {
    enrollmentId,
    summary,
    lessonProgress: {
      lessonId,
      status: 'completed',
      completed: true,
      progressPercent: 100,
      maxPositionSeconds,
      lastPositionSeconds: Math.max(0, Number.parseInt(currentProgress?.last_position_seconds, 10) || 0),
      durationSeconds,
      thresholdSeconds,
      completionEligible: true,
    },
  };
}
