import db from '@/api/_lib/db';
import Link from 'next/link';
import AdminShell from '../../_components/AdminShell';
import { addLessonToCourse } from '../actions';

export default async function AdminCourseDetails({ params }) {
  const { courseId } = params;
  let course = null;
  let lessons = [];
  let error = null;

  try {
    const sql = db.getSql();

    // Get Course details
    const courseRes = await sql`
      SELECT c.*, cl.title, cl.description 
      FROM courses c
      LEFT JOIN course_localizations cl ON c.id = cl.course_id AND cl.locale = 'zh-TW'
      WHERE c.id = ${courseId}
    `;

    if (courseRes.length > 0) course = courseRes[0];

    // Get Lessons
    if (course) {
      lessons = await sql`
        SELECT * FROM lessons 
        WHERE course_id = ${courseId} 
        ORDER BY lesson_sort_order ASC
      `;
    }
  } catch (err) {
    console.error("Course Details DB Error:", err);
    error = "Failed to retrieve this course. Ensure your DB is connected.";
  }

  if (!course && !error) {
    return <AdminShell><div style={{ padding: '40px' }}>Course not found: {courseId}</div></AdminShell>;
  }

  return (
    <AdminShell activeMenu="courses">
      <Link href="/admin/courses" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 500 }}>
        ← Back to Curriculum
      </Link>

      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>{course?.title || courseId}</h1>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, backgroundColor: '#e5e7eb', color: '#374151', padding: '4px 8px', borderRadius: '4px', marginRight: '8px' }}>
          {course?.track_key}
        </span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px' }}>
          {course?.status.toUpperCase()}
        </span>
      </header>

      {error ? (
        <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>{error}</div>
      ) : (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>

          {/* Main Content Area - Existing Lessons */}
          <div style={{ flex: 2 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>Configured Lessons</h2>

            {lessons.length === 0 ? (
              <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #d1d5db', textAlign: 'center', color: '#6b7280' }}>
                No lessons found. Add your first YouTube video using the panel.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {lessons.map((lesson, idx) => (
                  <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#374151' }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{lesson.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>YouTube ID: <span style={{ fontFamily: 'monospace' }}>{lesson.external_video_id}</span></p>
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                      {lesson.lesson_type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Add Lesson Form */}
          <div style={{ flex: 1, backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', position: 'sticky', top: '40px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Attach YouTube Video</h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '24px' }}>Embed a new lesson into this course directly.</p>

            <form action={addLessonToCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="hidden" name="courseId" value={courseId} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>Lesson Title</label>
                <input name="title" required type="text" placeholder="e.g., Understanding Transformers" style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>YouTube Video ID</label>
                <input name="externalVideoId" required type="text" placeholder="e.g., dQw4w9WgXcQ" style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Check the video URL <br />`watch?v=[ID_HERE]`</span>
              </div>

              <button type="submit" style={{ padding: '12px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginTop: '8px' }}>
                Submit & Publish
              </button>
            </form>
          </div>

        </div>
      )}
    </AdminShell>
  );
}
