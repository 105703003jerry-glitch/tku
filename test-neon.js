const { neon } = require('@neondatabase/serverless');
const sql = neon("postgresql://neondb_owner:npg_ImfjQZnD34iV@ep-weathered-salad-ancryc8m.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require");
async function run() {
  await sql("CREATE TABLE IF NOT EXISTS test_tb (id INT)");
  await sql("DROP TABLE test_tb");
  console.log("OK");
}
run().catch(console.dir);
