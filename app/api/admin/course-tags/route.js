import { NextResponse } from 'next/server';
import db from '@/api/_lib/db';
import { getAuthUser } from '@/app/lib/authSession';
import { createCourseTagOption, deleteCourseTagOption, listCourseTagOptions } from '@/app/lib/courseTags';

async function requireAdmin() {
  const user = await getAuthUser();

  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function GET() {
  try {
    await requireAdmin();
    const sql = db.getSql();
    const items = await listCourseTagOptions(sql);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to load course tags.' }, { status: error.message === 'Unauthorized' ? 403 : 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin();
    const sql = db.getSql();
    const body = await request.json();
    const item = await createCourseTagOption(sql, body.label);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to create course tag.' }, { status: error.message === 'Unauthorized' ? 403 : 500 });
  }
}

export async function DELETE(request) {
  try {
    await requireAdmin();
    const sql = db.getSql();
    const tagKey = request.nextUrl.searchParams.get('key');

    if (!tagKey) {
      return NextResponse.json({ error: 'key is required.' }, { status: 400 });
    }

    await deleteCourseTagOption(sql, tagKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to delete course tag.' }, { status: error.message === 'Unauthorized' ? 403 : 500 });
  }
}
