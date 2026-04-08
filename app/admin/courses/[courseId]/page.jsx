import db from '@/api/_lib/db';
import { getTrackOptionByKey, LEVEL_OPTIONS, TRACK_OPTIONS } from '@/app/lib/courseMeta';
import { ensureCourseTagSchema, getCourseTagKeys, listCourseTagOptions } from '@/app/lib/courseTags';
import Link from 'next/link';
import AdminShell from '../../_components/AdminShell';
import CourseCoverFields from '../CourseCoverFields';
import CourseTagSelector from '../CourseTagSelector';
import SaveCourseButton from '../SaveCourseButton';
import { addLessonToCourse, deleteLesson, updateCourseDetails, addModuleToCourse, deleteModuleFromCourse } from '../actions';
import CourseOrganizerClient from './CourseOrganizerClient';

export const dynamic = 'force-dynamic';

export default async function AdminCourseDetails({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { courseId } = resolvedParams;
  const saved = resolvedSearchParams?.saved === '1';
  let course = null;
  let lessons = [];
  let modules = [];
  let courseTagOptions = [];
  let selectedCourseTagKeys = [];
  let error = null;

  try {
    const sql = db.getSql();
    await ensureCourseTagSchema(sql);

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
      courseTagOptions = await listCourseTagOptions(sql);
      selectedCourseTagKeys = await getCourseTagKeys(sql, courseId);

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

  const courseDurationHours = Number.parseInt(course?.duration_label, 10);

  return (
    <AdminShell activeMenu="courses">
      <Link href="/admin/courses" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 500 }}>
        ← Back to Curriculum
      </Link>

      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>{course?.title || courseId}</h1>
      </header>

      {saved && (
        <div style={{ marginBottom: '20px', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', color: '#166534', fontSize: '0.88rem', fontWeight: 500 }}>
          Course settings updated successfully.
        </div>
      )}

      {!error && course && (
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Course Settings</h2>
          <form action={updateCourseDetails} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <input type="hidden" name="courseId" value={courseId} />
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Title (zh-TW)</label>
               <input name="title" defaultValue={course.title} required style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Track Category</label>
               <select name="trackKey" defaultValue={getTrackOptionByKey(course.track_key).key} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}>
                  {TRACK_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>{option.labelZh}</option>
                  ))}
               </select>
            </div>
            <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Level</label>
               <select name="levelKey" defaultValue={course.level_key} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}>
                  {LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
               </select>
            </div>
            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Status</label>
               <select name="status" defaultValue={course.status} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
               </select>
            </div>
            <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hours</label>
               <input name="durationHours" type="number" min="1" defaultValue={Number.isFinite(courseDurationHours) ? courseDurationHours : 40} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>課程 Hashtags</label>
               <CourseTagSelector initialOptions={courseTagOptions} initialSelectedKeys={selectedCourseTagKeys} />
            </div>
            <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Description (zh-TW)</label>
               <textarea name="description" defaultValue={course.description || ''} rows={3} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            <div style={{ flex: '1 1 100%' }}>
              <CourseCoverFields
                initialSource={course.cover_image_source || 'youtube'}
                initialPresetKey={course.cover_preset_key || undefined}
                existingImageUrl={course.cover_image_url || null}
                title={course.title || courseId}
                level={course.level_key}
                trackLabel={course.track_label_zh}
              />
            </div>
            <div style={{ flex: '1 1 100%', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
               <SaveCourseButton />
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
            <CourseOrganizerClient
              courseId={courseId}
              modules={modules.map((module) => ({
                id: String(module.id),
                title: module.title,
                sortOrder: Number(module.sort_order),
              }))}
              lessons={lessons.map((lesson) => ({
                id: String(lesson.id),
                title: lesson.title,
                externalVideoId: lesson.external_video_id,
                moduleSortOrder: Number(lesson.module_sort_order || 0),
                lessonSortOrder: Number(lesson.lesson_sort_order || 0),
              }))}
              deleteLessonAction={deleteLesson}
              deleteModuleAction={deleteModuleFromCourse}
            />
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
