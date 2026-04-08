import Link from 'next/link';
import db from '@/api/_lib/db';
import courseStore from '@/api/_lib/courseStore';
import { getAuthUser } from '@/app/lib/authSession';
import { ensureEnrollment, getCourseProgressSnapshot } from '@/app/lib/learningProgress';
import LearnCourseClient from './LearnCourseClient';

export const dynamic = 'force-dynamic';

export default async function LearnCoursePage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { courseId } = resolvedParams;
  let course = null;
  let error = null;
  let user = await getAuthUser();
  let sql;
  let progressSnapshot = {
    summary: {
      completedLessons: 0,
      totalLessons: 0,
      progressPercent: 0,
      lastActivityAt: null,
    },
    lessonProgressById: {},
  };

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

  if (user && course && sql) {
    try {
      await ensureEnrollment(sql, user.id, courseId);
      progressSnapshot = await getCourseProgressSnapshot(sql, user.id, courseId);
    } catch (err) {
      console.error("Learn page enrollment sync error:", err);
    }
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
      user={user}
      initialLessonIndex={activeLessonIndex}
      initialProgress={progressSnapshot}
      error={error}
    />
  );
}
