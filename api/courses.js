var courseStore = require('./_lib/courseStore');
var db = require('./_lib/db');
var errors = require('./_lib/errors');
var http = require('./_lib/http');

module.exports = async function(req, res) {
    var sql;
    var courseId;
    var items;

    if (req.method !== 'GET') {
        http.allowMethods(res, ['GET']);
        errors.jsonError(req, res, 405, 'Method not allowed');
        return;
    }

    try {
        sql = db.getSql();
        courseId = http.sanitize(req.query && req.query.courseId, 80) || '';
        items = await courseStore.getPublishedCourses(sql, courseId || null);

        http.jsonWithRequestId(req, res, 200, {
            ok: true,
            items: items
        });
    } catch (error) {
        errors.handleApiError(req, res, error, 'Unable to load courses right now.', 500, 'courses.list');
    }
};
