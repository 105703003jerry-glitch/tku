import { NextResponse } from 'next/server';
import db from '@/api/_lib/db';
import { seedSql } from '@/db/course_seed.js';
import { schemaSql } from '@/db/schema.js';

export async function GET() {
  try {
    const sql = db.getSql();
    
    if (schemaSql) {
       console.log("Running schema sequentially...");
       const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
       for (const stmt of statements) {
           try {
               await sql(stmt);
           } catch (stmtErr) {
               console.error("Statement error:", stmt, stmtErr);
               throw stmtErr;
           }
       }
    }
    
    if (seedSql) {
       console.log("Running seeds sequentially...");
       const seedStatements = seedSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
       for (const stmt of seedStatements) {
           try {
               await sql(stmt);
           } catch (stmtErr) {
               console.error("Seed statement error:", stmt, stmtErr);
               throw stmtErr;
           }
       }
    }
    
    // Some basic seed overrides
    // Create a demo student if not exist
    await sql`
      INSERT INTO users (name, email, role, nickname) 
      VALUES ('Demo Student', 'demo@example.com', 'student', 'Demo Learner')
      ON CONFLICT (email) DO NOTHING
    `;

    return NextResponse.json({ success: true, message: "Database schema inserted successfully!" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
