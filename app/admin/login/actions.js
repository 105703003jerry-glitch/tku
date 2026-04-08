'use server';
import db from '@/api/_lib/db';
import { setAuthSession } from '@/app/lib/authSession';
import { redirect } from 'next/navigation';

export async function performAdminLogin() {
  try {
    const sql = db.getSql();
    // Ensure the demo admin user exists
    let users = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
    if (!users || users.length === 0) {
      await sql`INSERT INTO users (name, email, role, nickname) VALUES ('System Admin', 'admin@pandoo.com', 'admin', 'SuperAdmin')`;
      users = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
    }
    
    // Set Secure session
    await setAuthSession(users[0].id);
    return { success: true };
  } catch (err) {
    console.error("Admin Login Error:", err);
    return { success: false, error: err.message };
  }
}
