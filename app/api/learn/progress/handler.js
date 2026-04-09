import { NextResponse } from 'next/server';
import db from '@/api/_lib/db';
import { getAuthUser } from '@/app/lib/authSession';
import {
  getCourseProgressSnapshot,
  markLessonCompleted,
  syncLessonPlayback,
} from '@/app/lib/learningProgress';

export async function GET(request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
    }

    const courseId = request.nextUrl.searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required.' }, { status: 400 });
    }

    const sql = db.getSql();
    const snapshot = await getCourseProgressSnapshot(sql, user.id, courseId);

    return NextResponse.json({
      ok: true,
      courseId,
      ...snapshot,
    });
  } catch (error) {
    console.error('App learn progress GET error:', error);
    return NextResponse.json({ error: error.message || 'Unable to load progress.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
    }

    const body = await request.json();
    const courseId = String(body.courseId || '').trim();
    const lessonId = Number.parseInt(body.lessonId, 10) || 0;
    const action = String(body.action || 'sync_playback');

    if (!courseId || !lessonId) {
      return NextResponse.json({ error: 'courseId and lessonId are required.' }, { status: 400 });
    }

    const sql = db.getSql();
    const result = action === 'mark_complete'
      ? await markLessonCompleted(sql, user.id, courseId, lessonId)
      : await syncLessonPlayback(sql, user.id, courseId, lessonId, body);

    return NextResponse.json({
      ok: true,
      courseId,
      ...result,
    });
  } catch (error) {
    console.error('App learn progress POST error:', error);
    return NextResponse.json({ error: error.message || 'Unable to update progress.' }, { status: 500 });
  }
}
