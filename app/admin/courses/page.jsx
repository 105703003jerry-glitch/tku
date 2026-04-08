import Link from 'next/link';
import db from '@/api/_lib/db';
import AdminShell from '../_components/AdminShell';

export default async function AdminCoursesPage() {
  let coursesList = [];
  let error = null;

  try {
    const sql = db.getSql();
    // Query localizations with courses to get title
    coursesList = await sql`
      SELECT c.id, c.track_key, c.status, c.created_at, cl.title
      FROM courses c
      LEFT JOIN course_localizations cl ON c.id = cl.course_id AND cl.locale = 'zh-TW'
      ORDER BY c.created_at DESC
    `;
  } catch (err) {
    console.error("Fetch Courses Error:", err);
    error = "Failed to load courses from the database.";
  }

  return (
    <AdminShell activeMenu="courses">
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>Curriculum Editor</h1>
           <p style={{ color: '#6b7280' }}>Manage tracks, publish courses, and embed new videos.</p>
        </div>
        <Link href="/admin/courses/new" style={{ padding: '10px 16px', backgroundColor: 'var(--brand-primary)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>+</span> Create New Course
        </Link>
      </header>

      {error ? (
        <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>
          {error}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {coursesList.map((course) => (
            <div key={course.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                 <span style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f3f4f6', color: '#4b5563', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                   Track: {course.track_key}
                 </span>
                 <span style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: course.status === 'published' ? '#dcfce7' : '#fef3c7', color: course.status === 'published' ? '#166534' : '#92400e', padding: '4px 8px', borderRadius: '4px' }}>
                   {course.status.toUpperCase()}
                 </span>
               </div>
               
               <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
                 {course.title || course.id}
               </h3>
               
               <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                 <Link href={`/admin/courses/${course.id}`} style={{ flex: 1, textAlign: 'center', padding: '8px', backgroundColor: '#f3f4f6', color: '#374151', textDecoration: 'none', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 500 }}>
                   Manage Video Lessons
                 </Link>
               </div>
            </div>
          ))}
          
          {coursesList.length === 0 && (
             <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#6b7280', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
               No courses currently available. Create one to begin.
             </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
