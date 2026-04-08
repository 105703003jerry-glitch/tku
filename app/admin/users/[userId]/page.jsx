import Link from 'next/link';
import db from '@/api/_lib/db';
import AdminShell from '../../_components/AdminShell';
import { ensureUserMembershipSchema, getMembershipTierOption } from '@/app/lib/userMembership';
import { ensureLearningProgressSchema, calculateCompletionThreshold } from '@/app/lib/learningProgress';
import { getTrackOptionByKey } from '@/app/lib/courseMeta';

function formatDateTime(value) {
  if (!value) {
    return 'Not yet';
  }

  try {
    return new Date(value).toLocaleString('zh-TW');
  } catch {
    return 'Not yet';
  }
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Number.parseInt(seconds, 10) || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const remainderSeconds = totalSeconds % 60;

  if (!minutes) {
    return `${remainderSeconds}s`;
  }

  if (!remainderSeconds) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainderSeconds}s`;
}

function getLessonStatusTone(status) {
  if (status === 'completed') {
    return { backgroundColor: '#dcfce7', color: '#166534' };
  }

  if (status === 'in_progress') {
    return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
  }

  return { backgroundColor: '#f3f4f6', color: '#4b5563' };
}

export default async function AdminUserDetailsPage({ params }) {
  const resolvedParams = await params;
  const userId = Number.parseInt(resolvedParams.userId, 10);
  let user = null;
  let courseProgressRows = [];
  let error = null;

  try {
    const sql = db.getSql();
    await ensureUserMembershipSchema(sql);
    await ensureLearningProgressSchema(sql);

    const userRows = await sql`
      SELECT id, name, email, nickname, role, membership_tier, created_at, last_login_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    user = userRows[0] || null;

    if (user) {
      courseProgressRows = await sql`
        WITH lesson_totals AS (
          SELECT course_id, COUNT(*)::int AS total_lessons
          FROM lessons
          GROUP BY course_id
        )
        SELECT
          enrollments.id AS enrollment_id,
          enrollments.course_id,
          enrollments.status AS enrollment_status,
          enrollments.progress_percent,
          enrollments.completed_lessons_count_snapshot,
          enrollments.enrolled_at,
          enrollments.last_activity_at,
          COALESCE(lesson_totals.total_lessons, 0) AS total_lessons,
          courses.track_key,
          courses.status AS course_status,
          course_localizations.title AS course_title,
          course_localizations.description AS course_description,
          lessons.id AS lesson_id,
          lessons.title AS lesson_title,
          lessons.duration_seconds,
          lessons.module_sort_order,
          lessons.lesson_sort_order,
          course_modules.title AS module_title,
          lesson_progress.status AS lesson_status,
          lesson_progress.progress_percent AS lesson_progress_percent,
          lesson_progress.time_spent_seconds,
          lesson_progress.max_position_seconds,
          lesson_progress.last_position_seconds,
          lesson_progress.started_at,
          lesson_progress.completed_at,
          lesson_progress.updated_at AS lesson_updated_at
        FROM enrollments
        LEFT JOIN lesson_totals
          ON lesson_totals.course_id = enrollments.course_id
        LEFT JOIN courses
          ON courses.id = enrollments.course_id
        LEFT JOIN course_localizations
          ON course_localizations.course_id = enrollments.course_id
         AND course_localizations.locale = 'zh-TW'
        LEFT JOIN lessons
          ON lessons.course_id = enrollments.course_id
        LEFT JOIN course_modules
          ON course_modules.course_id = lessons.course_id
         AND course_modules.locale = 'zh-TW'
         AND course_modules.sort_order = lessons.module_sort_order
        LEFT JOIN lesson_progress
          ON lesson_progress.enrollment_id = enrollments.id
         AND lesson_progress.lesson_id = lessons.id
        WHERE enrollments.user_id = ${userId}
        ORDER BY enrollments.last_activity_at DESC NULLS LAST, enrollments.enrolled_at DESC, lessons.module_sort_order ASC, lessons.lesson_sort_order ASC
      `;
    }
  } catch (err) {
    console.error('Admin user details error:', err);
    error = 'Failed to load this learner profile.';
  }

  if (!user && !error) {
    error = 'User not found.';
  }

  const courseMap = new Map();

  courseProgressRows.forEach((row) => {
    if (!courseMap.has(row.course_id)) {
      courseMap.set(row.course_id, {
        id: row.course_id,
        title: row.course_title || row.course_id,
        description: row.course_description || '',
        trackKey: row.track_key || 'mandarin-learning',
        trackLabel: getTrackOptionByKey(row.track_key).labelZh,
        courseStatus: row.course_status || 'draft',
        enrollmentStatus: row.enrollment_status || 'active',
        progressPercent: Number(row.progress_percent || 0),
        completedLessons: Number(row.completed_lessons_count_snapshot || 0),
        totalLessons: Number(row.total_lessons || 0),
        enrolledAt: row.enrolled_at,
        lastActivityAt: row.last_activity_at,
        lessons: [],
      });
    }

    if (row.lesson_id) {
      const thresholdSeconds = calculateCompletionThreshold(row.duration_seconds);
      courseMap.get(row.course_id).lessons.push({
        id: row.lesson_id,
        title: row.lesson_title || `Lesson ${row.lesson_id}`,
        moduleTitle: row.module_title || 'General',
        status: row.lesson_status || 'not_started',
        progressPercent: Math.round(Number(row.lesson_progress_percent || 0)),
        durationSeconds: Number(row.duration_seconds || 0),
        timeSpentSeconds: Number(row.time_spent_seconds || 0),
        maxPositionSeconds: Number(row.max_position_seconds || 0),
        thresholdSeconds,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        updatedAt: row.lesson_updated_at,
      });
    }
  });

  const enrolledCourses = Array.from(courseMap.values());
  const membership = getMembershipTierOption(user?.membership_tier);
  const completedCourses = enrolledCourses.filter((course) => course.progressPercent >= 100).length;
  const activeCourses = enrolledCourses.filter((course) => course.progressPercent > 0 && course.progressPercent < 100).length;
  const averageProgress = enrolledCourses.length > 0
    ? Math.round(enrolledCourses.reduce((sum, course) => sum + course.progressPercent, 0) / enrolledCourses.length)
    : 0;

  return (
    <AdminShell activeMenu="users">
      <Link href="/admin/users" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 500 }}>
        ← Back to User Management
      </Link>

      {error ? (
        <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>
          {error}
        </div>
      ) : (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '28px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>{user.nickname || user.name}</h1>
                  <p style={{ color: '#6b7280', marginBottom: '6px' }}>{user.email}</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Joined {formatDateTime(user.created_at)}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <span style={{ padding: '6px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: user.role === 'admin' ? '#dbeafe' : '#f3f4f6', color: user.role === 'admin' ? '#1e40af' : '#4b5563' }}>
                    {user.role.toUpperCase()}
                  </span>
                  <span style={{ padding: '6px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: membership.key === 'paid' ? '#fef3c7' : '#ecfeff', color: membership.key === 'paid' ? '#92400e' : '#155e75' }}>
                    {membership.labelZh}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>Enrolled Courses</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111827' }}>{enrolledCourses.length}</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>Completed</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111827' }}>{completedCourses}</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>In Progress</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111827' }}>{activeCourses}</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>Average Progress</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111827' }}>{averageProgress}%</div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>Quick Snapshot</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Last Login</div>
                  <div style={{ fontSize: '0.95rem', color: '#111827', fontWeight: 600 }}>{formatDateTime(user.last_login_at)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Most Recent Learning Activity</div>
                  <div style={{ fontSize: '0.95rem', color: '#111827', fontWeight: 600 }}>
                    {enrolledCourses[0]?.lastActivityAt ? formatDateTime(enrolledCourses[0].lastActivityAt) : 'No course activity yet'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>Learning Focus</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Array.from(new Set(enrolledCourses.map((course) => course.trackLabel))).map((label) => (
                      <span key={label} style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#eef2ff', color: '#4338ca', fontSize: '0.78rem', fontWeight: 700 }}>
                        {label}
                      </span>
                    ))}
                    {enrolledCourses.length === 0 && (
                      <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No learning focus yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>Learning Journey</h2>
                <p style={{ color: '#6b7280' }}>瀏覽這位學員看過哪些課程、每門課的完成度，以及每支影片目前的狀態。</p>
              </div>
            </div>

            {enrolledCourses.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', border: '1px dashed #d1d5db', borderRadius: '14px' }}>
                This learner has not started any courses yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {enrolledCourses.map((course) => (
                  <details key={course.id} style={{ border: '1px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#fcfcfd' }}>
                    <summary style={{ listStyle: 'none', cursor: 'pointer', padding: '18px 20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(220px, 1fr)', gap: '20px', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                            <span style={{ padding: '5px 9px', borderRadius: '999px', backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '0.74rem', fontWeight: 700 }}>
                              {course.trackLabel}
                            </span>
                            <span style={{ padding: '5px 9px', borderRadius: '999px', backgroundColor: course.courseStatus === 'published' ? '#dcfce7' : '#f3f4f6', color: course.courseStatus === 'published' ? '#166534' : '#4b5563', fontSize: '0.74rem', fontWeight: 700 }}>
                              {course.courseStatus}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>{course.title}</h3>
                          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: '#64748b', fontSize: '0.84rem' }}>
                            <span>Enrolled: {formatDateTime(course.enrolledAt)}</span>
                            <span>Last activity: {formatDateTime(course.lastActivityAt)}</span>
                            <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.84rem' }}>
                            <span style={{ color: '#64748b' }}>Course Progress</span>
                            <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{course.progressPercent}%</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${course.progressPercent}%`, height: '100%', backgroundColor: '#2563eb' }} />
                          </div>
                        </div>
                      </div>
                    </summary>

                    <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid #eef2f7' }}>
                      {course.lessons.length === 0 ? (
                        <div style={{ paddingTop: '16px', color: '#94a3b8', fontSize: '0.9rem' }}>This course does not have lessons yet.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '16px' }}>
                          {course.lessons.map((lesson) => {
                            const tone = getLessonStatusTone(lesson.status);
                            const readyToComplete = lesson.thresholdSeconds > 0 && lesson.maxPositionSeconds >= lesson.thresholdSeconds;

                            return (
                              <div key={lesson.id} style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                  <div>
                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>{lesson.moduleTitle}</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>{lesson.title}</div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      <span style={{ padding: '4px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, ...tone }}>
                                        {lesson.status}
                                      </span>
                                      <span style={{ padding: '4px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: readyToComplete ? '#dcfce7' : '#fff7ed', color: readyToComplete ? '#166534' : '#9a3412' }}>
                                        {readyToComplete ? 'Eligible to complete' : 'Below completion threshold'}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ minWidth: '240px', flex: '0 1 320px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                                      <span style={{ color: '#64748b' }}>Lesson Progress</span>
                                      <span style={{ color: '#111827', fontWeight: 700 }}>{lesson.progressPercent}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '999px', overflow: 'hidden', marginBottom: '10px' }}>
                                      <div style={{ width: `${lesson.progressPercent}%`, height: '100%', backgroundColor: tone.color }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', fontSize: '0.78rem', color: '#64748b' }}>
                                      <span>Duration: {formatDuration(lesson.durationSeconds)}</span>
                                      <span>Watched: {formatDuration(lesson.maxPositionSeconds)}</span>
                                      <span>Time spent: {formatDuration(lesson.timeSpentSeconds)}</span>
                                      <span>80% gate: {formatDuration(lesson.thresholdSeconds)}</span>
                                      <span>Last update: {formatDateTime(lesson.updatedAt)}</span>
                                      <span>Completed at: {formatDateTime(lesson.completedAt)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}
