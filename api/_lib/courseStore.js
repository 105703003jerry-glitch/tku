const { ensureCourseTagSchema, getCourseTagMap } = require('../../app/lib/courseTags');

async function ensureCourseCoverSchema(sql) {
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_url TEXT`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_source VARCHAR(20) NOT NULL DEFAULT 'youtube'`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_preset_key VARCHAR(80)`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_width INT`;
    await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS cover_image_height INT`;
}

async function getPublishedCourses(sql, courseId) {
    var courses;
    var localizations;
    var outcomes;
    var modules;
    var lessons;
    var courseTagMap;
    var courseMap = {};

    await ensureCourseCoverSchema(sql);
    await ensureCourseTagSchema(sql);

    if (courseId) {
        courses = await sql`
            SELECT
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
                sort_order
            FROM courses
            WHERE status = 'published'
              AND id = ${courseId}
            ORDER BY sort_order ASC, published_at DESC NULLS LAST, created_at ASC
        `;
    } else {
        courses = await sql`
            SELECT
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
                sort_order
            FROM courses
            WHERE status = 'published'
            ORDER BY sort_order ASC, published_at DESC NULLS LAST, created_at ASC
        `;
    }

    courseTagMap = await getCourseTagMap(sql);

    if (!courses.length) {
        return [];
    }

    if (courseId) {
        localizations = await sql`
            SELECT
                course_id,
                locale,
                title,
                summary,
                description,
                format_label,
                audience_label
            FROM course_localizations
            WHERE course_id = ${courseId}
        `;

        outcomes = await sql`
            SELECT
                course_id,
                locale,
                sort_order,
                content
            FROM course_outcomes
            WHERE course_id = ${courseId}
            ORDER BY course_id, locale, sort_order ASC
        `;

        modules = await sql`
            SELECT
                course_id,
                locale,
                sort_order,
                title
            FROM course_modules
            WHERE course_id = ${courseId}
            ORDER BY course_id, locale, sort_order ASC
        `;

        lessons = await sql`
            SELECT
                id,
                course_id,
                locale,
                module_sort_order,
                lesson_sort_order,
                title,
                lesson_type,
                content_url,
                external_video_id,
                thumbnail_url,
                duration_seconds
            FROM lessons
            WHERE course_id = ${courseId}
            ORDER BY course_id, module_sort_order ASC, lesson_sort_order ASC
        `;
    } else {
        localizations = await sql`
            SELECT
                course_id,
                locale,
                title,
                summary,
                description,
                format_label,
                audience_label
            FROM course_localizations
        `;

        outcomes = await sql`
            SELECT
                course_id,
                locale,
                sort_order,
                content
            FROM course_outcomes
            ORDER BY course_id, locale, sort_order ASC
        `;

        modules = await sql`
            SELECT
                course_id,
                locale,
                sort_order,
                title
            FROM course_modules
            ORDER BY course_id, locale, sort_order ASC
        `;

        lessons = await sql`
            SELECT
                id,
                course_id,
                locale,
                module_sort_order,
                lesson_sort_order,
                title,
                lesson_type,
                content_url,
                external_video_id,
                thumbnail_url,
                duration_seconds
            FROM lessons
            ORDER BY course_id, module_sort_order ASC, lesson_sort_order ASC
        `;
    }

    courses.forEach(function(course) {
        courseMap[course.id] = {
            id: course.id,
            track: course.track_key,
            trackLabel: {
                'zh-TW': course.track_label_zh,
                en: course.track_label_en
            },
            level: course.level_key,
            duration: course.duration_label,
            coverImageUrl: course.cover_image_url,
            coverImageSource: course.cover_image_source || 'youtube',
            coverPresetKey: course.cover_preset_key,
            coverImageWidth: course.cover_image_width,
            coverImageHeight: course.cover_image_height,
            instructor: course.instructor_name,
            courseTags: courseTagMap[course.id] || [],
            title: {},
            summary: {},
            description: {},
            format: {},
            audience: {},
            outcomes: {
                'zh-TW': [],
                en: []
            },
            modules: {
                'zh-TW': [],
                en: []
            },
            lessons: []
        };
    });

    localizations.forEach(function(item) {
        var target = courseMap[item.course_id];
        if (!target) {
            return;
        }
        target.title[item.locale] = item.title;
        target.summary[item.locale] = item.summary;
        target.description[item.locale] = item.description;
        target.format[item.locale] = item.format_label;
        target.audience[item.locale] = item.audience_label;
    });

    outcomes.forEach(function(item) {
        var target = courseMap[item.course_id];
        if (!target) {
            return;
        }
        if (!target.outcomes[item.locale]) {
            target.outcomes[item.locale] = [];
        }
        target.outcomes[item.locale].push(item.content);
    });

    modules.forEach(function(item) {
        var target = courseMap[item.course_id];
        if (!target) {
            return;
        }
        if (!target.modules[item.locale]) {
            target.modules[item.locale] = [];
        }
        target.modules[item.locale].push({ title: item.title, sortOrder: item.sort_order });
    });

    lessons.forEach(function(item) {
        var target = courseMap[item.course_id];
        if (!target) {
            return;
        }

        target.lessons.push({
            id: item.id,
            locale: item.locale,
            moduleSortOrder: item.module_sort_order,
            lessonSortOrder: item.lesson_sort_order,
            title: item.title,
            lessonType: item.lesson_type,
            contentUrl: item.content_url,
            externalVideoId: item.external_video_id,
            thumbnailUrl: item.thumbnail_url,
            durationSeconds: item.duration_seconds
        });
    });

    return courses.map(function(course) {
        return courseMap[course.id];
    });
}

async function courseExists(sql, courseId) {
    var rows = await sql`
        SELECT id
        FROM courses
        WHERE id = ${courseId}
          AND status = 'published'
        LIMIT 1
    `;

    return Boolean(rows.length);
}

module.exports = {
    courseExists: courseExists,
    getPublishedCourses: getPublishedCourses
};
