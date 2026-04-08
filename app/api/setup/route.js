import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import db from '@/api/_lib/db';

export async function GET() {
  try {
    const sql = db.getSql();
    
    // Read local files
    const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
    const seedPath = path.join(process.cwd(), 'db', 'course_seed.sql');
    
    let schemaSql = '';
    let seedSql = '';
    
    if (fs.existsSync(schemaPath)) schemaSql = fs.readFileSync(schemaPath, 'utf8');
    if (fs.existsSync(seedPath)) seedSql = fs.readFileSync(seedPath, 'utf8');
    
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
