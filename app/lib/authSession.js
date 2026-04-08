import { cookies } from 'next/headers';
import db from '@/api/_lib/db';

const SESSION_COOKIE_NAME = 'tkclc_session_id';

export async function setAuthSession(userId) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getAuthUser() {
  const cookieStore = await cookies();
  const userIdStr = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!userIdStr) return null;
  
  try {
    const sql = db.getSql();
    const users = await sql`SELECT * FROM users WHERE id = ${parseInt(userIdStr, 10)} LIMIT 1`;
    if (users && users.length > 0) {
      return users[0];
    }
    return null;
  } catch (err) {
    console.error("Auth Exception:", err);
    return null;
  }
}
