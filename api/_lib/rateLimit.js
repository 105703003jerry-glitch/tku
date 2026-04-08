var http = require('./http');

function buildKey(parts) {
    return parts
        .map(function(part) {
            return http.sanitize(part, 160) || 'anonymous';
        })
        .join(':');
}

async function countEvents(sql, bucket, scopeKey, windowSeconds) {
    var rows = await sql`
        SELECT COUNT(*)::int AS count
        FROM request_rate_limit_events
        WHERE bucket = ${bucket}
          AND scope_key = ${scopeKey}
          AND created_at >= NOW() - (${windowSeconds} * INTERVAL '1 second')
    `;

    return rows[0] ? Number(rows[0].count || 0) : 0;
}

async function recordEvent(sql, bucket, scopeKey, metadata) {
    await sql`
        INSERT INTO request_rate_limit_events (
            bucket,
            scope_key,
            ip_address,
            metadata
        )
        VALUES (
            ${bucket},
            ${scopeKey},
            ${http.sanitize((metadata && metadata.ip) || '', 120) || null},
            ${metadata ? JSON.stringify(metadata) : null}
        )
    `;
}

async function enforceRateLimit(sql, options) {
    var bucket = options.bucket;
    var scopeKey = options.scopeKey;
    var limit = options.limit;
    var windowSeconds = options.windowSeconds;
    var count = await countEvents(sql, bucket, scopeKey, windowSeconds);

    if (count >= limit) {
        return {
            ok: false,
            retryAfter: windowSeconds
        };
    }

    await recordEvent(sql, bucket, scopeKey, options.metadata || {});
    return {
        ok: true,
        remaining: Math.max(0, limit - count - 1)
    };
}

async function getAiQuota(sql, userId, limitPerDay) {
    var rows = await sql`
        SELECT COUNT(*)::int AS count
        FROM ai_usage_logs
        WHERE user_id = ${userId}
          AND created_at >= NOW() - INTERVAL '1 day'
          AND status IN ('succeeded', 'fallback')
    `;
    var count = rows[0] ? Number(rows[0].count || 0) : 0;

    return {
        count: count,
        limit: limitPerDay,
        remaining: Math.max(0, limitPerDay - count)
    };
}

module.exports = {
    buildKey: buildKey,
    countEvents: countEvents,
    enforceRateLimit: enforceRateLimit,
    getAiQuota: getAiQuota,
    recordEvent: recordEvent
};
