import Link from 'next/link';

// Use the existing DB logic
import db from '../../../api/_lib/db';
import courseStore from '../../../api/_lib/courseStore';

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

  // Fallback to placeholders only if DB fetch fails
  const courses = (!error && dbCourses.length > 0) ? dbCourses : [
    { id: 'master-ai-101', title: {'zh-TW': 'Mastering AI 101'}, level: 'Beginner', duration: '4 Hours', trackLabel: {'zh-TW': 'Core Concept'} },
    { id: 'gpt-advanced', title: {'zh-TW': 'Advanced Prompt Engineering'}, level: 'Intermediate', duration: '6 Hours', trackLabel: {'zh-TW': 'Skills'} },
    { id: 'ai-agents-pro', title: {'zh-TW': 'Building Autonomous Agents'}, level: 'Advanced', duration: '12 Hours', trackLabel: {'zh-TW': 'Pro Path'} },
  ];

  return (
    <main className="layout-container" style={{ padding: '40px 24px' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}>Explore Courses</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Find your next learning adventure.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">Go to Dashboard</Link>
      </header>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', marginBottom: '24px', fontSize: '0.9rem' }}>
          Database connection not configured. Showing sample courses.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {courses.map(course => (
          <Link href={`/checkout/${course.id}`} key={course.id} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ 
                height: '180px', 
                backgroundColor: '#f2f2f7', 
                backgroundImage: 'url(/assets/course_thumb_ai.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderBottom: '1px solid var(--border-light)' 
              }} 
            />
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'inline-block', backgroundColor: 'var(--brand-secondary)', color: 'var(--brand-primary)', fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', marginBottom: '12px' }}>
                {course.trackLabel?.['zh-TW'] || course.track}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>{course.title?.['zh-TW'] || 'Untitled'}</h3>
              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                <span>• Level: {course.level}</span>
                <span>• {course.duration}</span>
              </div>
              <div className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                Enroll Now
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
