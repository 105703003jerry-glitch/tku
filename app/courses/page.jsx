import Link from 'next/link';

// Use the existing DB logic
import db from '@/api/_lib/db';
import courseStore from '@/api/_lib/courseStore';
import CoursesCatalogClient from './CoursesCatalogClient';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  let dbCourses = [];
  let error = null;

  try {
    const sql = db.getSql();
    dbCourses = await courseStore.getPublishedCourses(sql);
  } catch (err) {
    console.error("DB Error:", err);
    error = true;
  }

  // Show samples only when DB access itself fails.
  const courses = error ? [
    { id: 'master-ai-101', title: {'zh-TW': 'Mastering AI 101'}, level: 'Beginner', duration: '4 Hours', trackLabel: {'zh-TW': 'Core Concept'} },
    { id: 'gpt-advanced', title: {'zh-TW': 'Advanced Prompt Engineering'}, level: 'Intermediate', duration: '6 Hours', trackLabel: {'zh-TW': 'Skills'} },
    { id: 'ai-agents-pro', title: {'zh-TW': 'Building Autonomous Agents'}, level: 'Advanced', duration: '12 Hours', trackLabel: {'zh-TW': 'Pro Path'} },
  ] : dbCourses;

  return (
    <main className="layout-container" style={{ padding: '40px 24px' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}>Explore Courses</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Find your next learning adventure. All courses are free to explore!</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">Go to Dashboard</Link>
      </header>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', marginBottom: '24px', fontSize: '0.9rem' }}>
          Database connection not configured. Showing sample courses.
        </div>
      )}

      {courses.length === 0 ? (
        <div style={{ padding: '24px', backgroundColor: '#ffffff', border: '1px dashed var(--border-light)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
          No published courses were found in the database.
        </div>
      ) : (
        <CoursesCatalogClient courses={courses} />
      )}
    </main>
  );
}
