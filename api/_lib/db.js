var neon = require('@neondatabase/serverless').neon;

var cachedSql = null;

function getSql() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is missing.');
    }

    if (!cachedSql) {
        cachedSql = neon(process.env.DATABASE_URL);
    }

    return cachedSql;
}

module.exports = {
    getSql: getSql
};
