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
    
    // 1. Insert into courses
    await sql`
      INSERT INTO courses (id, track_key, level_key, provider_id, status)
      VALUES (${id}, ${trackKey}, ${levelKey}, 'system', 'published')
    `;
    
    // 2. Insert default localization
    await sql`
      INSERT INTO course_localizations (course_id, locale, title, description)
      VALUES (${id}, 'zh-TW', ${title}, ${description})
    `;
    
    revalidatePath('/admin/courses');
    return { success: true, courseId: id };
  } catch (err) {
    console.error("Create Course Error:", err);
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
    
    // 1. Determine next lesson order ID
    const countRes = await sql`SELECT COUNT(id) FROM lessons WHERE course_id = ${courseId}`;
    const nextOrder = parseInt(countRes[0].count, 10);
    
    // 2. Insert into lessons
    await sql`
      INSERT INTO lessons (
        course_id, locale, module_sort_order, lesson_sort_order, 
        title, lesson_type, external_video_id
      ) VALUES (
        ${courseId}, 'zh-TW', 0, ${nextOrder}, 
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
