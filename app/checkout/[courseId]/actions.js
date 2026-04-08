'use server';

import db from '@/api/_lib/db';

export async function processCheckout(courseId) {
  try {
    const sql = db.getSql();
    
    // 1. Get the demo student user ID
    let users = await sql`SELECT id FROM users WHERE role = 'student' LIMIT 1`;
    if (!users || users.length === 0) {
      await sql`INSERT INTO users (name, email, role, nickname) VALUES ('Demo Student', 'demo@example.com', 'student', 'Demo Learner')`;
      users = await sql`SELECT id FROM users WHERE role = 'student' LIMIT 1`;
    }
    const userId = users[0].id;

    // 2. Insert into payment_transactions
    await sql`
      INSERT INTO payment_transactions (user_id, item_type, target_id, amount_cents, currency, status, payment_method)
      VALUES (${userId}, 'course', ${courseId}, 9900, 'TWD', 'completed', 'credit_card_demo')
    `;

    // 3. Insert into enrollments
    await sql`
      INSERT INTO enrollments (user_id, course_id, access_level, progress_percent)
      VALUES (${userId}, ${courseId}, 'full_access', 0)
      ON CONFLICT (user_id, course_id) DO UPDATE 
      SET last_activity_at = NOW()
    `;

    return { success: true };
  } catch (err) {
    console.error("Checkout database error:", err);
    return { success: false, error: err.message };
  }
}
