import { getTrackOptionByKey, parseTrackLabels } from '@/app/lib/courseMeta';

let courseTagSchemaReadyPromise = null;

export function normalizeCourseTagKey(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function normalizeCourseTagLabel(label) {
  return String(label || '').trim().replace(/\s+/g, ' ');
}

export function parseCourseTagKeys(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(String(rawValue));
    if (!Array.isArray(parsed)) {
      return [];
    }

    return Array.from(new Set(parsed.map((value) => String(value || '').trim()).filter(Boolean)));
  } catch (error) {
    return [];
  }
}

async function migrateLegacyCourseTags(sql) {
  const courses = await sql`
    SELECT id, track_key, track_label_zh
    FROM courses
  `;

  for (const course of courses) {
    const trackOption = getTrackOptionByKey(course.track_key);
    const legacyLabels = parseTrackLabels(course.track_label_zh);
    const migratedLabels = legacyLabels.filter((label) => label !== trackOption.labelZh);

    await sql`
      UPDATE courses
      SET
        track_key = ${trackOption.key},
        track_label_zh = ${trackOption.labelZh},
        track_label_en = ${trackOption.labelEn}
      WHERE id = ${course.id}
    `;

    for (let index = 0; index < migratedLabels.length; index += 1) {
      const label = normalizeCourseTagLabel(migratedLabels[index]);
      const key = normalizeCourseTagKey(label);

      if (!label || !key) {
        continue;
      }

      await sql`
        INSERT INTO course_tag_options (key, label_zh)
        VALUES (${key}, ${label})
        ON CONFLICT (key)
        DO UPDATE SET label_zh = EXCLUDED.label_zh
      `;

      await sql`
        INSERT INTO course_tag_assignments (course_id, tag_key, sort_order)
        VALUES (${course.id}, ${key}, ${(index + 1) * 10})
        ON CONFLICT (course_id, tag_key)
        DO NOTHING
      `;
    }
  }
}

export async function ensureCourseTagSchema(sql) {
  if (!courseTagSchemaReadyPromise) {
    courseTagSchemaReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS course_tag_options (
          id BIGSERIAL PRIMARY KEY,
          key VARCHAR(120) NOT NULL UNIQUE,
          label_zh VARCHAR(120) NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS course_tag_assignments (
          id BIGSERIAL PRIMARY KEY,
          course_id VARCHAR(80) NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
          tag_key VARCHAR(120) NOT NULL REFERENCES course_tag_options (key) ON DELETE CASCADE,
          sort_order INT NOT NULL DEFAULT 0,
          UNIQUE (course_id, tag_key)
        )
      `;

      await migrateLegacyCourseTags(sql);
    })().catch((error) => {
      courseTagSchemaReadyPromise = null;
      throw error;
    });
  }

  await courseTagSchemaReadyPromise;
}

export async function listCourseTagOptions(sql) {
  await ensureCourseTagSchema(sql);
  return sql`
    SELECT key, label_zh
    FROM course_tag_options
    ORDER BY label_zh ASC
  `;
}

export async function createCourseTagOption(sql, rawLabel) {
  await ensureCourseTagSchema(sql);

  const label = normalizeCourseTagLabel(rawLabel);
  const key = normalizeCourseTagKey(label);

  if (!label || !key) {
    throw new Error('Please enter a valid hashtag label.');
  }

  const rows = await sql`
    INSERT INTO course_tag_options (key, label_zh)
    VALUES (${key}, ${label})
    ON CONFLICT (key)
    DO UPDATE SET label_zh = course_tag_options.label_zh
    RETURNING key, label_zh
  `;

  return rows[0];
}

export async function deleteCourseTagOption(sql, key) {
  await ensureCourseTagSchema(sql);
  await sql`DELETE FROM course_tag_options WHERE key = ${String(key || '').trim()}`;
}

export async function getCourseTagMap(sql) {
  await ensureCourseTagSchema(sql);
  const rows = await sql`
    SELECT
      course_tag_assignments.course_id,
      course_tag_assignments.tag_key,
      course_tag_options.label_zh,
      course_tag_assignments.sort_order
    FROM course_tag_assignments
    INNER JOIN course_tag_options
      ON course_tag_options.key = course_tag_assignments.tag_key
    ORDER BY course_tag_assignments.course_id ASC, course_tag_assignments.sort_order ASC, course_tag_options.label_zh ASC
  `;

  const tagMap = {};

  rows.forEach((row) => {
    if (!tagMap[row.course_id]) {
      tagMap[row.course_id] = [];
    }

    tagMap[row.course_id].push({
      key: row.tag_key,
      label: row.label_zh,
    });
  });

  return tagMap;
}

export async function getCourseTagKeys(sql, courseId) {
  await ensureCourseTagSchema(sql);
  const rows = await sql`
    SELECT tag_key
    FROM course_tag_assignments
    WHERE course_id = ${courseId}
    ORDER BY sort_order ASC, tag_key ASC
  `;

  return rows.map((row) => row.tag_key);
}

export async function setCourseTagAssignments(sql, courseId, tagKeys) {
  await ensureCourseTagSchema(sql);

  const normalizedKeys = Array.from(new Set((tagKeys || []).map((key) => String(key || '').trim()).filter(Boolean)));

  await sql`DELETE FROM course_tag_assignments WHERE course_id = ${courseId}`;

  for (let index = 0; index < normalizedKeys.length; index += 1) {
    await sql`
      INSERT INTO course_tag_assignments (course_id, tag_key, sort_order)
      VALUES (${courseId}, ${normalizedKeys[index]}, ${(index + 1) * 10})
    `;
  }
}
