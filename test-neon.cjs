const { neon } = require('@neondatabase/serverless');
const sql = neon("postgresql://foo");
console.log(typeof sql.unsafe);
