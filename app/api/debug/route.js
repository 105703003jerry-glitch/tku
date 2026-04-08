import { NextResponse } from 'next/server';
import db from '@/api/_lib/db';

export async function GET() {
  try {
    const sql = db.getSql();
    const courses = await sql`SELECT * FROM courses`;
    const lessons = await sql`SELECT * FROM lessons`;
    return NextResponse.json({ courses, lessons });
  } catch (err) {
    return NextResponse.json({ error: err.message });
  }
}
