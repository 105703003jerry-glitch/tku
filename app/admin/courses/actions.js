'use server';

import db from '@/api/_lib/db';
import { getAuthUser } from '@/app/lib/authSession';
import { revalidatePath } from 'next/cache';

// Verify Admin Role before execution
async function checkAdmin() {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }
}

export async function createCourse(formData) {
  try {
    await checkAdmin();
    const sql = db.getSql();
    
    const id = formData.get('id');
    const title = formData.get('title');
    const description = formData.get('description');
    const trackKey = formData.get('trackKey');
    const levelKey = formData.get('levelKey');
    const summary = description;
    const trackLabelZh = trackKey === 'ai-fundamentals'
      ? 'AI Fundamentals'
      : trackKey === 'data-engineering'
        ? 'Data Engineering'
        : 'Career Path';
    const trackLabelEn = trackLabelZh;
    const durationLabel = 'Self-paced';
    const instructorName = 'TKU Team';
    const formatLabel = 'Video lessons';
    const audienceLabel = 'All learners';
    
    // 1. Insert into courses
    await sql`
      INSERT INTO courses (
        id,
        track_key,
        track_label_zh,
        track_label_en,
        level_key,
        duration_label,
        instructor_name,
        status,
        published_at
      )
      VALUES (
        ${id},
        ${trackKey},
        ${trackLabelZh},
        ${trackLabelEn},
        ${levelKey},
        ${durationLabel},
        ${instructorName},
        'published',
        NOW()
      )
    `;
    
    // 2. Insert default localization
    await sql`
      INSERT INTO course_localizations (
        course_id,
        locale,
        title,
        summary,
        description,
        format_label,
        audience_label
      )
      VALUES (
        ${id},
        'zh-TW',
        ${title},
        ${summary},
        ${description},
        ${formatLabel},
        ${audienceLabel}
      )
    `;
    
    revalidatePath('/admin/courses');
    revalidatePath('/courses');
    revalidatePath(`/learn/${id}`);
    return { success: true, courseId: id };
  } catch (err) {
    console.error("Create Course Error:", err);
    return { success: false, error: err.message };
  }
}

export async function addModuleToCourse(formData) {
  try {
    await checkAdmin();
    const sql = db.getSql();
    
    const courseId = formData.get('courseId');
    const title = formData.get('title');
    
    // Determine next module sort order
    const countRes = await sql`SELECT COUNT(id) FROM course_modules WHERE course_id = ${courseId} AND locale = 'zh-TW'`;
    // We multiply by 10 so orders are 10, 20, 30... for easier manual reordering if needed later
    const nextOrder = (parseInt(countRes[0].count, 10) + 1) * 10;
    
    await sql`
      INSERT INTO course_modules (
        course_id, locale, sort_order, title
      ) VALUES (
        ${courseId}, 'zh-TW', ${nextOrder}, ${title}
      )
    `;
    
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true };
  } catch (err) {
    console.error("Add Module Error:", err);
    return { success: false, error: err.message };
  }
}

export async function addLessonToCourse(formData) {
  try {
    await checkAdmin();
    const sql = db.getSql();
    
    const courseId = formData.get('courseId');
    const title = formData.get('title');
    const externalVideoId = formData.get('externalVideoId');
    const moduleSortOrder = parseInt(formData.get('moduleSortOrder') || 0, 10);
    
    // 1. Determine next lesson order ID within the module
    const countRes = await sql`SELECT COUNT(id) FROM lessons WHERE course_id = ${courseId} AND module_sort_order = ${moduleSortOrder}`;
    const nextOrder = (parseInt(countRes[0].count, 10) + 1) * 10;
    
    // 2. Insert into lessons
    await sql`
      INSERT INTO lessons (
        course_id, locale, module_sort_order, lesson_sort_order, 
        title, lesson_type, external_video_id
      ) VALUES (
        ${courseId}, 'zh-TW', ${moduleSortOrder}, ${nextOrder}, 
        ${title}, 'video', ${externalVideoId}
      )
    `;
    
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true };
  } catch (err) {
    console.error("Add Lesson Error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteLesson(formData) {
  try {
    await checkAdmin();
    const sql = db.getSql();
    
    const lessonId = formData.get('lessonId');
    const courseId = formData.get('courseId');
    
    if (!lessonId) throw new Error("Lesson ID required");
    
    await sql`DELETE FROM lessons WHERE id = ${lessonId} AND course_id = ${courseId}`;
    
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true };
  } catch (err) {
    console.error("Delete Lesson Error:", err);
    return { success: false, error: err.message };
  }
}

export async function updateCourseDetails(formData) {
  try {
    await checkAdmin();
    const sql = db.getSql();
    
    const id = formData.get('courseId');
    const title = formData.get('title');
    const description = formData.get('description');
    const status = formData.get('status');
    
    if (!id || !title) throw new Error("Missing required fields");
    
    // Update courses table
    await sql`
      UPDATE courses 
      SET status = ${status}, updated_at = NOW() 
      WHERE id = ${id}
    `;
    
    // Update course_localizations (zh-TW)
    await sql`
      UPDATE course_localizations 
      SET title = ${title}, description = ${description}
      WHERE course_id = ${id} AND locale = 'zh-TW'
    `;
    
    revalidatePath(`/admin/courses/${id}`);
    revalidatePath(`/admin/courses`);
    revalidatePath('/courses');
    revalidatePath(`/learn/${id}`);
    return { success: true };
  } catch (err) {
    console.error("Update Course Error:", err);
    return { success: false, error: err.message };
  }
}
