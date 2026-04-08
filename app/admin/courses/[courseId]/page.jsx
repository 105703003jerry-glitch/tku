import db from '@/api/_lib/db';
import Link from 'next/link';
import AdminShell from '../../_components/AdminShell';
import { addLessonToCourse, deleteLesson, updateCourseDetails, addModuleToCourse } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminCourseDetails({ params }) {
  const { courseId } = params;
  let course = null;
  let lessons = [];
  let modules = [];
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

    // Get Modules and Lessons
    if (course) {
      modules = await sql`
        SELECT * FROM course_modules
        WHERE course_id = ${courseId} AND locale = 'zh-TW'
        ORDER BY sort_order ASC
      `;

      lessons = await sql`
        SELECT * FROM lessons 
        WHERE course_id = ${courseId} 
        ORDER BY module_sort_order ASC, lesson_sort_order ASC
      `;
    }
  } catch (err) {
    console.error("Course Details DB Error:", err);
    error = "Failed to retrieve this course. Ensure your DB is connected.";
  }

  if (!course && !error) {
    return <AdminShell><div style={{ padding: '40px' }}>Course not found: {courseId}</div></AdminShell>;
  }

  // Group lessons by module_sort_order
  const groupedLessons = {};
  
  // Initialize Uncategorized (0)
  groupedLessons[0] = { title: "Uncategorized Lessons", lessons: [] };
  
  // Initialize configured modules
  modules.forEach(m => {
    groupedLessons[m.sort_order] = { title: m.title, lessons: [] };
  });

  // Populate lessons
  lessons.forEach(l => {
    if (groupedLessons[l.module_sort_order]) {
      groupedLessons[l.module_sort_order].lessons.push(l);
    } else {
      groupedLessons[0].lessons.push(l); // Fallback if module was deleted
    }
  });

  return (
    <AdminShell activeMenu="courses">
      <Link href="/admin/courses" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 500 }}>
        ← Back to Curriculum
      </Link>

      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>{course?.title || courseId}</h1>
      </header>

      {!error && course && (
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Course Settings</h2>
          <form action={updateCourseDetails} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <input type="hidden" name="courseId" value={courseId} />
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Title (zh-TW)</label>
               <input name="title" defaultValue={course.title} required style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Status</label>
               <select name="status" defaultValue={course.status} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
               </select>
            </div>
            <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Description (zh-TW)</label>
               <textarea name="description" defaultValue={course.description || ''} rows={3} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div style={{ flex: '1 1 100%', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
               <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {error ? (
        <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>{error}</div>
      ) : (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Main Content Area - Existing Lessons Grouped by Modules */}
          <div style={{ flex: '1 1 600px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>Course Modules & Lessons</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.keys(groupedLessons).sort((a,b)=>parseInt(a)-parseInt(b)).map(modOrder => {
                const mod = groupedLessons[modOrder];
                if (modOrder === '0' && mod.lessons.length === 0) return null; // Hide uncategorized if empty
                
                return (
                  <div key={modOrder} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '16px 20px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#374151', margin: 0 }}>
                        {modOrder === '0' ? 'General' : `Topic: ${mod.title}`}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280', backgroundColor: '#e5e7eb', padding: '4px 8px', borderRadius: '12px' }}>
                        {mod.lessons.length} lessons
                      </span>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {mod.lessons.length === 0 ? (
                        <div style={{ fontSize: '0.9rem', color: '#9ca3af', textAlign: 'center', padding: '12px' }}>No videos attached in this topic yet.</div>
                      ) : mod.lessons.map((lesson, idx) => (
                        <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f3f4f6', gap: '16px' }}>
                          <div style={{ width: '30px', height: '30px', backgroundColor: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>
                            {idx + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontWeight: 500, color: '#111827', margin: 0, fontSize: '0.95rem' }}>{lesson.title}</h4>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0 0 0' }}>YouTube ID: <span style={{ fontFamily: 'monospace' }}>{lesson.external_video_id}</span></p>
                          </div>
                          <div style={{ color: '#ef4444' }}>
                            <form action={deleteLesson}>
                              <input type="hidden" name="lessonId" value={lesson.id} />
                              <input type="hidden" name="courseId" value={courseId} />
                              <button type="submit" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', padding: 0 }}>Delete</button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebars - Add Module & Add Lesson Form */}
          <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Create Topic Form */}
            <div style={{ backgroundColor: '#f9fafb', padding: '24px', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>1. Create Topic (Module)</h3>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '16px' }}>Organize your course into structured topics.</p>
              
              <form action={addModuleToCourse} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="hidden" name="courseId" value={courseId} />
                <input name="title" required type="text" placeholder="e.g., Week 1: Basics" style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <button type="submit" style={{ padding: '8px', backgroundColor: 'white', color: '#111827', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                  + Add Topic Folder
                </button>
              </form>
            </div>

            {/* Attach Lesson Form */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', position: 'sticky', top: '40px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>2. Attach YouTube Video</h3>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '24px' }}>Upload a video into a specific topic.</p>

              <form action={addLessonToCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input type="hidden" name="courseId" value={courseId} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>Select Topic</label>
                  <select name="moduleSortOrder" required style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%', backgroundColor: 'white' }}>
                    <option value="0">General / Uncategorized</option>
                    {modules.map(mod => (
                       <option value={mod.sort_order} key={mod.id}>{mod.title}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>Lesson Title</label>
                  <input name="title" required type="text" placeholder="e.g., Understanding AI" style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>YouTube Video ID</label>
                  <input name="externalVideoId" required type="text" placeholder="e.g., dQw4w9WgXcQ" style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }} />
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Check the video URL `watch?v=[ID_HERE]`</span>
                </div>

                <button type="submit" style={{ padding: '12px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginTop: '8px' }}>
                  Submit & Sync Video
                </button>
              </form>
            </div>
            
          </div>
        </div>
      )}
    </AdminShell>
  );
}
