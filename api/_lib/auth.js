var crypto = require('crypto');
var http = require('./http');

var SESSION_COOKIE = 'tkclc_session';
var SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function normalizeEmail(email) {
    return http.sanitize(email, 160).toLowerCase();
}

function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createPasswordRecord(password) {
    var salt = crypto.randomBytes(16).toString('hex');
    var hash = hashPassword(password, salt);

    return {
        salt: salt,
        hash: hash
    };
}

function verifyPassword(password, salt, expectedHash) {
    var actualHash = hashPassword(password, salt);
    var actualBuffer = Buffer.from(actualHash, 'hex');
    var expectedBuffer = Buffer.from(String(expectedHash || ''), 'hex');

    if (actualBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function getAdminEmails() {
    return String(process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(function(email) {
            return normalizeEmail(email);
        })
        .filter(Boolean);
}

function getRoleForEmail(email) {
    return getAdminEmails().indexOf(normalizeEmail(email)) !== -1 ? 'admin' : 'student';
}

function isAdmin(user) {
    if (!user) {
        return false;
    }

    return user.role === 'admin' || getRoleForEmail(user.email) === 'admin';
}

async function createSession(sql, userId) {
    var token = crypto.randomBytes(32).toString('hex');
    var tokenHash = hashToken(token);
    var expiresAt = new Date(Date.now() + (SESSION_MAX_AGE * 1000));
    var ipAddress = null;
    var userAgent = null;

    if (arguments.length > 2 && arguments[2]) {
        ipAddress = http.sanitize(arguments[2].ip, 120) || null;
        userAgent = http.sanitize(arguments[2].userAgent, 500) || null;
    }

    await sql`
        INSERT INTO sessions (
            user_id,
            token_hash,
            ip_address,
            user_agent,
            expires_at,
            last_seen_at
        )
        VALUES (
            ${userId},
            ${tokenHash},
            ${ipAddress},
            ${userAgent},
            ${expiresAt.toISOString()},
            NOW()
        )
    `;

    return {
        token: token,
        expiresAt: expiresAt
    };
}

async function destroySession(sql, token) {
    if (!token) {
        return;
    }

    await sql`
        UPDATE sessions
        SET revoked_at = NOW()
        WHERE token_hash = ${hashToken(token)}
    `;
}

async function getSessionUser(sql, req) {
    var cookies = http.parseCookies(req);
    var token = cookies[SESSION_COOKIE];
    var rows;

    if (!token) {
        return null;
    }

    rows = await sql`
        SELECT
            users.id,
            users.name,
            users.email,
            users.role,
            users.locale,
            users.auth_provider,
            users.avatar_url,
            users.created_at,
            sessions.id AS session_id,
            sessions.last_seen_at
        FROM sessions
        INNER JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ${hashToken(token)}
          AND sessions.expires_at > NOW()
          AND sessions.revoked_at IS NULL
        LIMIT 1
    `;

    if (!rows.length) {
        return null;
    }

    if (!rows[0].last_seen_at || ((new Date()).getTime() - (new Date(rows[0].last_seen_at)).getTime()) > (15 * 60 * 1000)) {
        await sql`
            UPDATE sessions
            SET last_seen_at = NOW()
            WHERE id = ${rows[0].session_id}
        `;
    }

    return {
        token: token,
        sessionId: rows[0].session_id,
        lastSeenAt: rows[0].last_seen_at,
        user: {
            id: rows[0].id,
            name: rows[0].name,
            email: rows[0].email,
            role: rows[0].role,
            locale: rows[0].locale,
            auth_provider: rows[0].auth_provider,
            avatar_url: rows[0].avatar_url,
            created_at: rows[0].created_at
        }
    };
}

function setSessionCookie(res, token, expiresAt) {
    http.setCookie(res, SESSION_COOKIE, token, {
        path: '/',
        maxAge: SESSION_MAX_AGE,
        expires: expiresAt
    });
}

function clearSessionCookie(res) {
    http.setCookie(res, SESSION_COOKIE, '', {
        path: '/',
        maxAge: 0,
        expires: new Date(0)
    });
}

module.exports = {
    clearSessionCookie: clearSessionCookie,
    createPasswordRecord: createPasswordRecord,
    createSession: createSession,
    destroySession: destroySession,
    getRoleForEmail: getRoleForEmail,
    getSessionUser: getSessionUser,
    isAdmin: isAdmin,
    normalizeEmail: normalizeEmail,
    setSessionCookie: setSessionCookie,
    verifyPassword: verifyPassword
};
