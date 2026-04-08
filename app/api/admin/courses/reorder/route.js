import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import db from '@/api/_lib/db';
import { getAuthUser } from '@/app/lib/authSession';

function uniqueValues(values) {
  return Array.from(new Set(values));
}

export async function POST(request) {
  try {
    const user = await getAuthUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const courseId = String(body.courseId || '').trim();
    const type = String(body.type || '').trim();

    if (!courseId || !type) {
      return NextResponse.json({ error: 'courseId and type are required.' }, { status: 400 });
    }

    const sql = db.getSql();

    if (type === 'modules') {
      const providedOrder = uniqueValues((body.orderedModuleSortOrders || []).map((value) => Number.parseInt(value, 10)).filter((value) => value > 0));
      const existingModules = await sql`
        SELECT sort_order
        FROM course_modules
        WHERE course_id = ${courseId}
          AND locale = 'zh-TW'
        ORDER BY sort_order ASC
      `;
      const existingOrders = existingModules.map((module) => Number(module.sort_order));

      if (providedOrder.length !== existingOrders.length || providedOrder.some((value) => !existingOrders.includes(value))) {
        return NextResponse.json({ error: 'Topic reorder payload does not match the current course topics.' }, { status: 400 });
      }

      const tempMappings = providedOrder.map((oldSortOrder, index) => ({
        oldSortOrder,
        tempSortOrder: -1000 - index,
        nextSortOrder: (index + 1) * 10,
      }));

      for (const mapping of tempMappings) {
        await sql`
          UPDATE course_modules
          SET sort_order = ${mapping.tempSortOrder}
          WHERE course_id = ${courseId}
            AND locale = 'zh-TW'
            AND sort_order = ${mapping.oldSortOrder}
        `;
        await sql`
          UPDATE lessons
          SET module_sort_order = ${mapping.tempSortOrder}
          WHERE course_id = ${courseId}
            AND module_sort_order = ${mapping.oldSortOrder}
        `;
      }

      for (const mapping of tempMappings) {
        await sql`
          UPDATE course_modules
          SET sort_order = ${mapping.nextSortOrder}
          WHERE course_id = ${courseId}
            AND locale = 'zh-TW'
            AND sort_order = ${mapping.tempSortOrder}
        `;
        await sql`
          UPDATE lessons
          SET module_sort_order = ${mapping.nextSortOrder}
          WHERE course_id = ${courseId}
            AND module_sort_order = ${mapping.tempSortOrder}
        `;
      }
    } else if (type === 'lessons') {
      const modules = Array.isArray(body.modules) ? body.modules : [];
      const providedLessonIds = modules.flatMap((module) =>
        Array.isArray(module.lessonIds) ? module.lessonIds.map((lessonId) => String(lessonId)) : []
      );
      const existingLessons = await sql`
        SELECT id
        FROM lessons
        WHERE course_id = ${courseId}
        ORDER BY id ASC
      `;
      const existingLessonIds = existingLessons.map((lesson) => String(lesson.id));

      if (
        providedLessonIds.length !== existingLessonIds.length ||
        uniqueValues(providedLessonIds).length !== existingLessonIds.length ||
        providedLessonIds.some((lessonId) => !existingLessonIds.includes(lessonId))
      ) {
        return NextResponse.json({ error: 'Lesson reorder payload does not match the current course lessons.' }, { status: 400 });
      }

      for (const module of modules) {
        const moduleSortOrder = Number.parseInt(module.moduleSortOrder, 10) || 0;
        const lessonIds = Array.isArray(module.lessonIds) ? module.lessonIds : [];

        for (let index = 0; index < lessonIds.length; index += 1) {
          const lessonId = Number.parseInt(lessonIds[index], 10) || 0;

          if (!lessonId) {
            continue;
          }

          await sql`
            UPDATE lessons
            SET
              module_sort_order = ${moduleSortOrder},
              lesson_sort_order = ${(index + 1) * 10}
            WHERE id = ${lessonId}
              AND course_id = ${courseId}
          `;
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported reorder type.' }, { status: 400 });
    }

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath('/admin/courses');
    revalidatePath(`/learn/${courseId}`);
    revalidatePath('/courses');

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin course reorder error:', error);
    return NextResponse.json({ error: error.message || 'Unable to save the new order.' }, { status: 500 });
  }
}
