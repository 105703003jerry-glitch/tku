'use server';

import { put } from '@vercel/blob';
import db from '@/api/_lib/db';
import { getAuthUser } from '@/app/lib/authSession';
import { buildTrackMetadata, formatDurationLabel, normalizeCourseId } from '@/app/lib/courseMeta';
import {
  COURSE_COVER_RECOMMENDED_HEIGHT,
  COURSE_COVER_RECOMMENDED_WIDTH,
  normalizeCoverPresetKey,
  normalizeCoverSource,
  readImageMetadata,
  validateCourseCoverUpload,
} from '@/app/lib/courseCover';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Verify Admin Role before execution
async function checkAdmin() {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }
}

async function ensureCourseCoverSchema(sql) {
  await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_url TEXT`;
  await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_source VARCHAR(20) NOT NULL DEFAULT 'youtube'`;
  await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_preset_key VARCHAR(80)`;
  await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_width INT`;
  await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_height INT`;
}

async function uploadCourseCover({ courseId, file }) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Cover uploads require `BLOB_READ_WRITE_TOKEN` in Vercel environment variables.');
  }

  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('A valid cover image file is required.');
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { width, height } = readImageMetadata(fileBuffer);
  const validation = validateCourseCoverUpload({ file, width, height });

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const extension = file.type === 'image/png' ? 'png' : (file.type === 'image/webp' ? 'webp' : 'jpg');
  const sanitizedFilename = `${courseId}-${Date.now()}.${extension}`;
  const upload = await put(`course-covers/${sanitizedFilename}`, fileBuffer, {
    access: 'public',
    addRandomSuffix: false,
    contentType: file.type,
  });

  return {
    coverImageUrl: upload.url,
    coverImageWidth: width,
    coverImageHeight: height,
  };
}

async function resolveCourseCoverPayload(formData, courseId, currentCourse = null) {
  const coverSource = normalizeCoverSource(formData.get('coverSource'));
  const coverPresetKey = normalizeCoverPresetKey(formData.get('coverPresetKey'));
  const coverFile = formData.get('coverImage');
  const hasNewUpload = coverFile && typeof coverFile === 'object' && typeof coverFile.size === 'number' && coverFile.size > 0;

  if (hasNewUpload) {
    const uploaded = await uploadCourseCover({ courseId, file: coverFile });
    return {
      coverImageSource: 'upload',
      coverImageUrl: uploaded.coverImageUrl,
      coverPresetKey: null,
      coverImageWidth: uploaded.coverImageWidth,
      coverImageHeight: uploaded.coverImageHeight,
    };
  }

  if (coverSource === 'preset') {
    return {
      coverImageSource: 'preset',
      coverImageUrl: null,
      coverPresetKey,
      coverImageWidth: COURSE_COVER_RECOMMENDED_WIDTH,
      coverImageHeight: COURSE_COVER_RECOMMENDED_HEIGHT,
    };
  }

  if (coverSource === 'youtube') {
    return {
      coverImageSource: 'youtube',
      coverImageUrl: null,
      coverPresetKey: currentCourse?.cover_preset_key || null,
      coverImageWidth: null,
      coverImageHeight: null,
    };
  }

  if (currentCourse?.cover_image_source === 'upload' && currentCourse?.cover_image_url) {
    return {
      coverImageSource: 'upload',
      coverImageUrl: currentCourse.cover_image_url,
      coverPresetKey: null,
      coverImageWidth: currentCourse.cover_image_width || null,
      coverImageHeight: currentCourse.cover_image_height || null,
    };
  }

  if (coverSource === 'upload') {
    throw new Error('Please choose a cover image file before saving.');
  }

  return {
    coverImageSource: 'preset',
    coverImageUrl: null,
    coverPresetKey,
    coverImageWidth: COURSE_COVER_RECOMMENDED_WIDTH,
    coverImageHeight: COURSE_COVER_RECOMMENDED_HEIGHT,
  };
}

export async function createCourse(formData) {
  try {
    await checkAdmin();
    const sql = db.getSql();
    await ensureCourseCoverSchema(sql);
    
    const rawId = formData.get('id');
    const title = formData.get('title');
    const description = formData.get('description');
    const trackKey = formData.get('trackKey');
    const trackLabels = formData.get('trackLabels');
    const levelKey = formData.get('levelKey');
    const durationHours = formData.get('durationHours');
    const id = normalizeCourseId(rawId, title);
    const summary = description;
    const trackMeta = buildTrackMetadata(trackKey, trackLabels);
    const durationLabel = formatDurationLabel(durationHours);
    const instructorName = 'TKU Team';
    const formatLabel = 'Video lessons';
    const audienceLabel = 'All learners';
    
    if (!id) {
      throw new Error('Please provide a valid course slug.');
    }

    const coverPayload = await resolveCourseCoverPayload(formData, id);

    // 1. Insert into courses
    await sql`
      INSERT INTO courses (
        id,
        track_key,
        track_label_zh,
        track_label_en,
        level_key,
        duration_label,
        cover_image_url,
        cover_image_source,
        cover_preset_key,
        cover_image_width,
        cover_image_height,
        instructor_name,
        status,
        published_at
      )
      VALUES (
        ${id},
        ${trackMeta.trackKey},
        ${trackMeta.trackLabelZh},
        ${trackMeta.trackLabelEn},
        ${levelKey},
        ${durationLabel},
        ${coverPayload.coverImageUrl},
        ${coverPayload.coverImageSource},
        ${coverPayload.coverPresetKey},
        ${coverPayload.coverImageWidth},
        ${coverPayload.coverImageHeight},
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
    revalidatePath('/dashboard');
    revalidatePath(`/learn/${id}`);
    return { success: true, courseId: id };
  } catch (err) {
    console.error("Create Course Error:", err);
    if (err.code === '23505') {
      return { success: false, error: 'This course slug already exists. Please use a different one.' };
    }
    return { success: false, error: err.message };
  }
}

export async function addModuleToCourse(formData) {
  try {
    await checkAdmin();
    const sql = db.getSql();
    await ensureCourseCoverSchema(sql);
    
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

export async function deleteModuleFromCourse(formData) {
  try {
    await checkAdmin();
    const sql = db.getSql();
    await ensureCourseCoverSchema(sql);

    const courseId = formData.get('courseId');
    const moduleSortOrder = parseInt(formData.get('moduleSortOrder') || 0, 10);

    if (!courseId) {
      throw new Error('Course ID required');
    }

    if (!moduleSortOrder) {
      throw new Error('Topic ID required');
    }

    await sql`
      UPDATE lessons
      SET module_sort_order = 0
      WHERE course_id = ${courseId}
        AND module_sort_order = ${moduleSortOrder}
    `;

    await sql`
      DELETE FROM course_modules
      WHERE course_id = ${courseId}
        AND locale = 'zh-TW'
        AND sort_order = ${moduleSortOrder}
    `;

    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true };
  } catch (err) {
    console.error("Delete Module Error:", err);
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

export async function deleteCourse(formData) {
  try {
    await checkAdmin();
    const sql = db.getSql();

    const courseId = formData.get('courseId');

    if (!courseId) {
      throw new Error('Course ID required');
    }

    await sql`DELETE FROM courses WHERE id = ${courseId}`;

    revalidatePath('/admin/courses');
    revalidatePath('/courses');
    revalidatePath('/dashboard');
    revalidatePath(`/learn/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true };
  } catch (err) {
    console.error("Delete Course Error:", err);
    return { success: false, error: err.message };
  }
}

export async function updateCourseDetails(formData) {
  let redirectPath = null;

  try {
    await checkAdmin();
    const sql = db.getSql();
    await ensureCourseCoverSchema(sql);
    
    const id = formData.get('courseId');
    const title = formData.get('title');
    const description = formData.get('description');
    const status = formData.get('status');
    const trackKey = formData.get('trackKey');
    const trackLabels = formData.get('trackLabels');
    const levelKey = formData.get('levelKey');
    const durationHours = formData.get('durationHours');
    const trackMeta = buildTrackMetadata(trackKey, trackLabels);
    const durationLabel = formatDurationLabel(durationHours);
    
    if (!id || !title) throw new Error("Missing required fields");

    const currentCourseRows = await sql`
      SELECT cover_image_url, cover_image_source, cover_preset_key, cover_image_width, cover_image_height
      FROM courses
      WHERE id = ${id}
      LIMIT 1
    `;
    const coverPayload = await resolveCourseCoverPayload(formData, id, currentCourseRows[0] || null);
    
    // Update courses table
    await sql`
      UPDATE courses 
      SET
        track_key = ${trackMeta.trackKey},
        track_label_zh = ${trackMeta.trackLabelZh},
        track_label_en = ${trackMeta.trackLabelEn},
        level_key = ${levelKey},
        duration_label = ${durationLabel},
        cover_image_url = ${coverPayload.coverImageUrl},
        cover_image_source = ${coverPayload.coverImageSource},
        cover_preset_key = ${coverPayload.coverPresetKey},
        cover_image_width = ${coverPayload.coverImageWidth},
        cover_image_height = ${coverPayload.coverImageHeight},
        status = ${status},
        updated_at = NOW()
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
    revalidatePath('/dashboard');
    revalidatePath(`/learn/${id}`);
    redirectPath = `/admin/courses/${id}`;
  } catch (err) {
    console.error("Update Course Error:", err);
    return { success: false, error: err.message };
  }

  redirect(redirectPath);
}
