export const schemaSql = `
CREATE TABLE IF NOT EXISTS inquiries (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(160) NOT NULL,
    organization VARCHAR(160),
    country VARCHAR(120),
    interest VARCHAR(80) NOT NULL,
    message TEXT NOT NULL,
    locale VARCHAR(20),
    source_page VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_email_idx ON inquiries (email);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_salt VARCHAR(64),
    password_hash VARCHAR(128),
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'password',
    google_sub VARCHAR(255),
    avatar_url TEXT,
    last_login_at TIMESTAMPTZ,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    locale VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
    ALTER COLUMN password_salt DROP NOT NULL,
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'password',
    ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255),
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
    ON users (google_sub)
    WHERE google_sub IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    ip_address VARCHAR(120),
    user_agent VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS ip_address VARCHAR(120),
    ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500),
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at DESC);

CREATE TABLE IF NOT EXISTS enrollments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    completed_lessons_count_snapshot INT NOT NULL DEFAULT 0,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

ALTER TABLE enrollments
    ADD COLUMN IF NOT EXISTS completed_lessons_count_snapshot INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS enrollments_user_id_idx ON enrollments (user_id, last_activity_at DESC);

CREATE TABLE IF NOT EXISTS course_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id VARCHAR(80) NOT NULL,
    progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    completed_units INT NOT NULL DEFAULT 0,
    total_units INT NOT NULL DEFAULT 0,
    current_module VARCHAR(160),
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS course_progress_user_id_idx ON course_progress (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_conversations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id VARCHAR(80),
    title VARCHAR(160),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_conversations_user_id_idx ON ai_conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES ai_conversations (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    provider VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_messages_conversation_id_idx ON ai_messages (conversation_id, created_at ASC);

ALTER TABLE ai_conversations
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS provider VARCHAR(40),
    ADD COLUMN IF NOT EXISTS model VARCHAR(80),
    ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    conversation_id BIGINT REFERENCES ai_conversations (id) ON DELETE SET NULL,
    message_id BIGINT REFERENCES ai_messages (id) ON DELETE SET NULL,
    provider VARCHAR(40),
    model VARCHAR(80),
    input_tokens INT,
    output_tokens INT,
    estimated_cost NUMERIC(10, 6),
    status VARCHAR(20) NOT NULL DEFAULT 'succeeded',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_logs_user_id_idx ON ai_usage_logs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS request_rate_limit_events (
    id BIGSERIAL PRIMARY KEY,
    bucket VARCHAR(80) NOT NULL,
    scope_key VARCHAR(220) NOT NULL,
    ip_address VARCHAR(120),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS request_rate_limit_events_lookup_idx
    ON request_rate_limit_events (bucket, scope_key, created_at DESC);

CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(80) PRIMARY KEY,
    track_key VARCHAR(80) NOT NULL,
    track_label_zh VARCHAR(80) NOT NULL,
    track_label_en VARCHAR(80) NOT NULL,
    level_key VARCHAR(20) NOT NULL,
    duration_label VARCHAR(80) NOT NULL,
    instructor_name VARCHAR(160) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    sort_order INT NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_localizations (
    id BIGSERIAL PRIMARY KEY,
    course_id VARCHAR(80) NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    locale VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    format_label VARCHAR(160) NOT NULL,
    audience_label VARCHAR(200) NOT NULL,
    UNIQUE (course_id, locale)
);

CREATE TABLE IF NOT EXISTS course_outcomes (
    id BIGSERIAL PRIMARY KEY,
    course_id VARCHAR(80) NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    locale VARCHAR(20) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    UNIQUE (course_id, locale, sort_order)
);

CREATE TABLE IF NOT EXISTS course_modules (
    id BIGSERIAL PRIMARY KEY,
    course_id VARCHAR(80) NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    locale VARCHAR(20) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    title VARCHAR(200) NOT NULL,
    UNIQUE (course_id, locale, sort_order)
);

CREATE TABLE IF NOT EXISTS lessons (
    id BIGSERIAL PRIMARY KEY,
    course_id VARCHAR(80) NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    locale VARCHAR(20) NOT NULL,
    module_sort_order INT NOT NULL DEFAULT 0,
    lesson_sort_order INT NOT NULL DEFAULT 0,
    title VARCHAR(200) NOT NULL,
    lesson_type VARCHAR(40) NOT NULL DEFAULT 'video',
    content_url TEXT,
    external_video_id VARCHAR(40),
    thumbnail_url TEXT,
    duration_seconds INT,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS external_video_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS lessons_course_sort_unique_idx
    ON lessons (course_id, module_sort_order, lesson_sort_order);

CREATE TABLE IF NOT EXISTS lesson_progress (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id BIGINT NOT NULL REFERENCES enrollments (id) ON DELETE CASCADE,
    lesson_id BIGINT NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_viewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (enrollment_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS lesson_progress_enrollment_id_idx
    ON lesson_progress (enrollment_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS activity_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id VARCHAR(80) NOT NULL,
    lesson_id BIGINT REFERENCES lessons (id) ON DELETE SET NULL,
    event_type VARCHAR(40) NOT NULL,
    payload_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_events_user_id_idx
    ON activity_events (user_id, created_at DESC);

-- Pandoo LMS Extended Schema Profile
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS nickname VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS title VARCHAR(100);

-- Certificates for completing courses
CREATE TABLE IF NOT EXISTS certificates (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id VARCHAR(80) NOT NULL,
    certificate_url TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS certificates_user_id_idx ON certificates (user_id);

-- Payment Transactions for virtual checkout
CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id VARCHAR(80) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, successful, failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_transactions_user_id_idx ON payment_transactions (user_id);
`;
