'use server';
import db from '@/api/_lib/db';
import { setAuthSession, clearAuthSession } from '../lib/authSession';
import { redirect } from 'next/navigation';

export async function performDemoLogin() {
  try {
    const sql = db.getSql();
    // 1. Ensure the demo user exists
    let users = await sql`SELECT id FROM users WHERE role = 'student' LIMIT 1`;
    if (!users || users.length === 0) {
      await sql`INSERT INTO users (name, email, role, nickname) VALUES ('Demo Student', 'demo@example.com', 'student', 'Demo Learner')`;
      users = await sql`SELECT id FROM users WHERE role = 'student' LIMIT 1`;
    }
    
    // 2. Set Secure session
    await setAuthSession(users[0].id);
    return { success: true };
  } catch (err) {
    console.error("Login Server Error:", err);
    return { success: false, error: err.message };
  }
}

export async function performLogout() {
  await clearAuthSession();
  redirect('/login');
}
