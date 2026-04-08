import crypto from 'crypto';
import { cookies } from 'next/headers';
import db from '@/api/_lib/db';
import auth from '@/api/_lib/auth';

const SESSION_COOKIE_NAME = 'tkclc_session';
const LEGACY_SESSION_COOKIE_NAME = 'tkclc_session_id';

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export async function setAuthSession(userId) {
  const sql = db.getSql();
  const session = await auth.createSession(sql, userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
    expires: session.expiresAt,
    maxAge: 60 * 60 * 24 * 30
  });
  cookieStore.delete(LEGACY_SESSION_COOKIE_NAME);
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  const sql = db.getSql();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      await auth.destroySession(sql, token);
    } catch (err) {
      console.error('Clear session error:', err);
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(LEGACY_SESSION_COOKIE_NAME);
}

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const legacyUserIdStr = cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value;
  
  try {
    const sql = db.getSql();

    if (token) {
      const users = await sql`
        SELECT users.*
        FROM sessions
        INNER JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ${hashToken(token)}
          AND sessions.expires_at > NOW()
          AND sessions.revoked_at IS NULL
        LIMIT 1
      `;

      if (users && users.length > 0) {
        return users[0];
      }
    }

    if (legacyUserIdStr) {
      const users = await sql`SELECT * FROM users WHERE id = ${parseInt(legacyUserIdStr, 10)} LIMIT 1`;
      if (users && users.length > 0) {
        return users[0];
      }
    }

    return null;
  } catch (err) {
    console.error("Auth Exception:", err);
    return null;
  }
}
