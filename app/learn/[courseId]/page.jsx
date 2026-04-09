import Link from 'next/link';
import db from '@/api/_lib/db';
import courseStore from '@/api/_lib/courseStore';
import { getAuthUser } from '@/app/lib/authSession';
import LearnCourseClient from './LearnCourseClient';

export const dynamic = 'force-dynamic';

function normalizeDateValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function serializeViewerForClient(user) {
  if (!user) {
    return null;
  }

  return {
    name: user.name || '',
    nickname: user.nickname || '',
    avatar_url: user.avatar_url || null,
    membership_tier: user.membership_tier || 'free',
  };
}

function serializeProgressSnapshot(snapshot) {
  const lessonProgressById = {};

  Object.entries(snapshot?.lessonProgressById || {}).forEach(([lessonId, progress]) => {
    lessonProgressById[lessonId] = {
      lessonId: Number.parseInt(progress?.lessonId, 10) || 0,
      status: progress?.status || 'not_started',
      completed: Boolean(progress?.completed),
      progressPercent: Number(progress?.progressPercent || 0),
      timeSpentSeconds: Number.parseInt(progress?.timeSpentSeconds, 10) || 0,
      maxPositionSeconds: Number.parseInt(progress?.maxPositionSeconds, 10) || 0,
      lastPositionSeconds: Number.parseInt(progress?.lastPositionSeconds, 10) || 0,
      durationSeconds: Number.parseInt(progress?.durationSeconds, 10) || 0,
      thresholdSeconds: Number.parseInt(progress?.thresholdSeconds, 10) || 0,
      completionEligible: Boolean(progress?.completionEligible),
      completedAt: normalizeDateValue(progress?.completedAt),
      updatedAt: normalizeDateValue(progress?.updatedAt),
    };
  });

  return {
    enrollmentId: snapshot?.enrollmentId ? Number.parseInt(snapshot.enrollmentId, 10) || null : null,
    summary: {
      completedLessons: Number.parseInt(snapshot?.summary?.completedLessons, 10) || 0,
      totalLessons: Number.parseInt(snapshot?.summary?.totalLessons, 10) || 0,
      progressPercent: Number.parseInt(snapshot?.summary?.progressPercent, 10) || 0,
      lastActivityAt: normalizeDateValue(snapshot?.summary?.lastActivityAt),
    },
    lessonProgressById,
  };
}

export default async function LearnCoursePage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { courseId } = resolvedParams;
  let course = null;
  let error = null;
  let viewer = null;
  let sql;

  try {
    viewer = serializeViewerForClient(await getAuthUser());
  } catch (err) {
    console.error("Learn page auth lookup error:", err);
  }

  try {
    sql = db.getSql();
    const courses = await courseStore.getPublishedCourses(sql, courseId);
    if (courses && courses.length > 0) {
      course = courses[0];
    }
  } catch (err) {
    console.error("Learn page course fetch error:", err);
    error = "Database connection not configured or failed. Showing placeholder.";
  }

  // Keep placeholders only for DB failures so empty DB states remain visible.
  const lessons = error ? [
    { title: "Introduction to AI", externalVideoId: "jZ952vChhuI" }, 
    { title: "Neural Networks Basics", externalVideoId: "aircAruvnKk" }
  ] : (course?.lessons || []);
  
  // Support interactive menu selection via query parameters
  const requestedLessonIndex = resolvedSearchParams?.lesson ? parseInt(resolvedSearchParams.lesson, 10) : 0;
  const activeLessonIndex = Number.isFinite(requestedLessonIndex) && requestedLessonIndex >= 0 && requestedLessonIndex < lessons.length
    ? requestedLessonIndex
    : 0;

  if (!course) {
    return (
      <main style={{ padding: '40px 24px' }}>
        <Link href="/courses" style={{ color: 'var(--brand-primary)', textDecoration: 'none' }}>← Back to courses</Link>
        <div style={{ marginTop: '24px', padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          Course not found.
        </div>
      </main>
    );
  }

  return (
    <LearnCourseClient
      course={course}
      courseId={courseId}
      isAuthenticated={Boolean(viewer)}
      viewer={viewer}
      initialLessonIndex={activeLessonIndex}
      initialProgress={serializeProgressSnapshot(null)}
      error={error}
    />
  );
}
