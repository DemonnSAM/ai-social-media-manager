-- ============================================================
-- AI Social Media Management Platform
-- Production Database Schema v1.0.0
-- PostgreSQL 15+
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE auth_provider AS ENUM ('email', 'google', 'github');
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE social_platform AS ENUM ('instagram', 'facebook', 'linkedin', 'youtube', 'twitter', 'tiktok');
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published', 'failed', 'cancelled', 'archived');
CREATE TYPE media_type AS ENUM ('image', 'video', 'gif', 'document');
CREATE TYPE schedule_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE inbox_item_type AS ENUM ('comment', 'message', 'mention', 'reaction');
CREATE TYPE inbox_status AS ENUM ('unread', 'read', 'replied', 'archived', 'flagged');
CREATE TYPE ai_feature_type AS ENUM ('caption', 'hashtag', 'reply_suggestion', 'analytics_explanation', 'image_alt', 'content_idea');
CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'business', 'enterprise');
CREATE TYPE notification_type AS ENUM ('post_published', 'post_failed', 'comment_received', 'mention', 'team_invite', 'analytics_report');

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           CITEXT NOT NULL UNIQUE,
    display_name    VARCHAR(100) NOT NULL,
    avatar_url      TEXT,
    auth_provider   auth_provider NOT NULL DEFAULT 'email',
    password_hash   TEXT,                          -- NULL for OAuth users
    status          user_status NOT NULL DEFAULT 'pending_verification',
    timezone        VARCHAR(64) NOT NULL DEFAULT 'UTC',
    locale          VARCHAR(10) NOT NULL DEFAULT 'en',
    last_login_at   TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,                   -- Soft delete
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_not_empty CHECK (email <> ''),
    CONSTRAINT users_password_or_oauth CHECK (
        (auth_provider = 'email' AND password_hash IS NOT NULL) OR
        (auth_provider <> 'email' AND password_hash IS NULL)
    )
);

-- Separate table for OAuth tokens (avoids polluting users table)
CREATE TABLE user_oauth_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        auth_provider NOT NULL,
    provider_uid    VARCHAR(255) NOT NULL,         -- e.g. Google sub
    access_token    TEXT,
    refresh_token   TEXT,
    token_expires_at TIMESTAMPTZ,
    raw_profile     JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_uid)
);

CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,          -- Store hashed token only
    ip_address      INET,
    user_agent      TEXT,
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TEAMS & BILLING
-- ============================================================

CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,  -- URL-friendly identifier
    avatar_url      TEXT,
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    max_members     INTEGER NOT NULL DEFAULT 1,
    max_social_accounts INTEGER NOT NULL DEFAULT 1,
    max_scheduled_posts INTEGER NOT NULL DEFAULT 10,
    settings        JSONB NOT NULL DEFAULT '{}',
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE team_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            team_role NOT NULL DEFAULT 'viewer',
    invited_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE TABLE team_invitations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    invited_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email           CITEXT NOT NULL,
    role            team_role NOT NULL DEFAULT 'viewer',
    token_hash      TEXT NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    accepted_at     TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOCIAL MEDIA ACCOUNTS
-- ============================================================

CREATE TABLE social_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    platform        social_platform NOT NULL,
    platform_account_id VARCHAR(255) NOT NULL,     -- External account ID
    account_name    VARCHAR(255) NOT NULL,
    account_handle  VARCHAR(255),
    avatar_url      TEXT,
    access_token    TEXT NOT NULL,                  -- Encrypted at application layer
    refresh_token   TEXT,
    token_expires_at TIMESTAMPTZ,
    token_scopes    TEXT[],
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_synced_at  TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}',    -- Platform-specific data (page_id, etc.)
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, platform, platform_account_id)
);

-- ============================================================
-- CONTENT / POSTS
-- ============================================================

CREATE TABLE posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title           VARCHAR(255),                   -- Internal label, not published
    body            TEXT,                           -- Base content (may be overridden per platform)
    status          post_status NOT NULL DEFAULT 'draft',
    is_template     BOOLEAN NOT NULL DEFAULT FALSE, -- Reusable content templates
    tags            TEXT[] NOT NULL DEFAULT '{}',   -- Internal content tags
    metadata        JSONB NOT NULL DEFAULT '{}',
    published_at    TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-platform post variant (one post can target multiple platforms)
CREATE TABLE post_targets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    body_override   TEXT,                           -- Platform-specific caption override
    platform_post_id VARCHAR(255),                  -- ID returned by platform API after publish
    status          post_status NOT NULL DEFAULT 'draft',
    published_at    TIMESTAMPTZ,
    error_message   TEXT,
    retry_count     SMALLINT NOT NULL DEFAULT 0,
    metadata        JSONB NOT NULL DEFAULT '{}',    -- Hashtags, first comment, etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, social_account_id)
);

CREATE TABLE media_assets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    media_type      media_type NOT NULL,
    file_name       VARCHAR(500) NOT NULL,
    storage_key     TEXT NOT NULL UNIQUE,           -- S3/GCS object key
    cdn_url         TEXT,
    mime_type       VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    width_px        INTEGER,
    height_px       INTEGER,
    duration_sec    NUMERIC(10,2),                  -- For video/audio
    alt_text        TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE post_media (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    media_asset_id  UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    display_order   SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, media_asset_id)
);

-- ============================================================
-- SCHEDULING & QUEUE
-- ============================================================

CREATE TABLE post_schedules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_target_id  UUID NOT NULL REFERENCES post_targets(id) ON DELETE CASCADE,
    scheduled_at    TIMESTAMPTZ NOT NULL,
    status          schedule_status NOT NULL DEFAULT 'pending',
    processing_started_at TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    next_retry_at   TIMESTAMPTZ,
    retry_count     SMALLINT NOT NULL DEFAULT 0,
    max_retries     SMALLINT NOT NULL DEFAULT 3,
    error_message   TEXT,
    worker_id       TEXT,                           -- Which worker claimed this job
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit trail for all publish attempts
CREATE TABLE publish_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_target_id  UUID NOT NULL REFERENCES post_targets(id) ON DELETE CASCADE,
    schedule_id     UUID REFERENCES post_schedules(id) ON DELETE SET NULL,
    attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    succeeded       BOOLEAN NOT NULL,
    http_status     SMALLINT,
    response_body   TEXT,
    error_message   TEXT,
    duration_ms     INTEGER
);

-- ============================================================
-- ANALYTICS
-- ============================================================

CREATE TABLE analytics_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_target_id  UUID NOT NULL REFERENCES post_targets(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    impressions     BIGINT NOT NULL DEFAULT 0,
    reach           BIGINT NOT NULL DEFAULT 0,
    likes           INTEGER NOT NULL DEFAULT 0,
    comments        INTEGER NOT NULL DEFAULT 0,
    shares          INTEGER NOT NULL DEFAULT 0,
    saves           INTEGER NOT NULL DEFAULT 0,
    clicks          INTEGER NOT NULL DEFAULT 0,
    video_views     INTEGER NOT NULL DEFAULT 0,
    video_watch_time_sec BIGINT NOT NULL DEFAULT 0,
    engagement_rate NUMERIC(6,4),                   -- Calculated: (likes+comments+shares)/reach
    raw_data        JSONB NOT NULL DEFAULT '{}',    -- Full platform API response
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aggregated account-level metrics (not tied to specific post)
CREATE TABLE account_analytics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    period_date     DATE NOT NULL,                  -- Aggregated by day
    followers       INTEGER NOT NULL DEFAULT 0,
    following       INTEGER NOT NULL DEFAULT 0,
    total_posts     INTEGER NOT NULL DEFAULT 0,
    new_followers   INTEGER NOT NULL DEFAULT 0,
    lost_followers  INTEGER NOT NULL DEFAULT 0,
    profile_visits  INTEGER NOT NULL DEFAULT 0,
    impressions     BIGINT NOT NULL DEFAULT 0,
    raw_data        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(social_account_id, period_date)
);

-- ============================================================
-- UNIFIED INBOX
-- ============================================================

CREATE TABLE inbox_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    post_target_id  UUID REFERENCES post_targets(id) ON DELETE SET NULL,
    platform_item_id VARCHAR(255) NOT NULL,         -- External ID from platform
    item_type       inbox_item_type NOT NULL,
    status          inbox_status NOT NULL DEFAULT 'unread',
    sender_name     VARCHAR(255),
    sender_handle   VARCHAR(255),
    sender_avatar_url TEXT,
    sender_platform_id VARCHAR(255),
    content         TEXT,
    sentiment       SMALLINT,                       -- -1 neg, 0 neutral, 1 pos (AI-scored)
    assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_item_id  UUID REFERENCES inbox_items(id) ON DELETE SET NULL,  -- Threading
    platform_created_at TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}',
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(social_account_id, platform_item_id)
);

CREATE TABLE inbox_replies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inbox_item_id   UUID NOT NULL REFERENCES inbox_items(id) ON DELETE CASCADE,
    replied_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content         TEXT NOT NULL,
    platform_reply_id VARCHAR(255),
    is_ai_suggested BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at         TIMESTAMPTZ,
    failed_at       TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI FEATURES & LOGS
-- ============================================================

CREATE TABLE ai_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_type    ai_feature_type NOT NULL,
    model           VARCHAR(100) NOT NULL,          -- e.g. 'claude-3-5-sonnet', 'gpt-4o'
    prompt_tokens   INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens    INTEGER NOT NULL DEFAULT 0,
    latency_ms      INTEGER,
    succeeded       BOOLEAN NOT NULL DEFAULT TRUE,
    error_message   TEXT,
    -- Context references (nullable - depends on feature type)
    post_id         UUID REFERENCES posts(id) ON DELETE SET NULL,
    inbox_item_id   UUID REFERENCES inbox_items(id) ON DELETE SET NULL,
    social_account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',    -- Input params (topic, tone, etc.)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_suggestions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_request_id   UUID NOT NULL REFERENCES ai_requests(id) ON DELETE CASCADE,
    suggestion_type ai_feature_type NOT NULL,
    content         TEXT NOT NULL,
    display_order   SMALLINT NOT NULL DEFAULT 0,
    was_used        BOOLEAN,                        -- NULL = not reviewed yet
    used_at         TIMESTAMPTZ,
    used_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id         UUID REFERENCES teams(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    action_url      TEXT,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG (Immutable)
-- ============================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,          -- e.g. 'post.published', 'member.invited'
    resource_type   VARCHAR(50),                    -- e.g. 'post', 'team_member'
    resource_id     UUID,
    ip_address      INET,
    user_agent      TEXT,
    changes         JSONB,                          -- Before/after for updates
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);                 -- Partition by month for scale

-- Create partitions for current + next year (add via migration each quarter)
CREATE TABLE audit_logs_2025_q1 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE audit_logs_2025_q2 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE audit_logs_2025_q3 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE audit_logs_2025_q4 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026_q1 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE audit_logs_2026_q2 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

-- ============================================================
-- INDEXES
-- ============================================================

-- users
CREATE INDEX idx_users_email ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users (status) WHERE deleted_at IS NULL;

-- user_sessions
CREATE INDEX idx_sessions_user_id ON user_sessions (user_id);
CREATE INDEX idx_sessions_expires ON user_sessions (expires_at) WHERE revoked_at IS NULL;

-- teams
CREATE INDEX idx_teams_owner ON teams (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_slug ON teams (slug) WHERE deleted_at IS NULL;

-- team_members
CREATE INDEX idx_team_members_user ON team_members (user_id);
CREATE INDEX idx_team_members_team ON team_members (team_id);

-- social_accounts
CREATE INDEX idx_social_accounts_team ON social_accounts (team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_social_accounts_platform ON social_accounts (platform, team_id);

-- posts
CREATE INDEX idx_posts_team ON posts (team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_status ON posts (team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_created_by ON posts (created_by);
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);

-- post_targets
CREATE INDEX idx_post_targets_post ON post_targets (post_id);
CREATE INDEX idx_post_targets_account ON post_targets (social_account_id);
CREATE INDEX idx_post_targets_status ON post_targets (status);

-- post_schedules (critical for queue worker polling)
CREATE INDEX idx_schedules_pending ON post_schedules (scheduled_at, status)
    WHERE status = 'pending';
CREATE INDEX idx_schedules_retry ON post_schedules (next_retry_at)
    WHERE status = 'failed' AND retry_count < max_retries;

-- analytics
CREATE INDEX idx_analytics_post_target ON analytics_snapshots (post_target_id, recorded_at DESC);
CREATE INDEX idx_account_analytics_date ON account_analytics (social_account_id, period_date DESC);

-- inbox
CREATE INDEX idx_inbox_team ON inbox_items (team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_inbox_account ON inbox_items (social_account_id, status);
CREATE INDEX idx_inbox_assigned ON inbox_items (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_inbox_post ON inbox_items (post_target_id) WHERE post_target_id IS NOT NULL;

-- ai_requests
CREATE INDEX idx_ai_requests_team ON ai_requests (team_id, created_at DESC);
CREATE INDEX idx_ai_requests_user ON ai_requests (user_id, created_at DESC);
CREATE INDEX idx_ai_requests_type ON ai_requests (feature_type, team_id);

-- notifications
CREATE INDEX idx_notifications_user ON notifications (user_id, is_read, created_at DESC);

-- audit_logs (on each partition automatically)
CREATE INDEX idx_audit_team ON audit_logs (team_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs (resource_type, resource_id);

-- ============================================================
-- UPDATED_AT AUTO-TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users', 'user_oauth_accounts', 'teams', 'team_members',
        'social_accounts', 'posts', 'post_targets', 'media_assets',
        'post_schedules', 'analytics_snapshots', 'account_analytics',
        'inbox_items', 'ai_requests'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- VIEWS (Convenience)
-- ============================================================

-- Active team members with user info
CREATE VIEW v_team_members AS
SELECT
    tm.team_id,
    tm.role,
    tm.accepted_at,
    u.id AS user_id,
    u.display_name,
    u.email,
    u.avatar_url,
    u.status AS user_status
FROM team_members tm
JOIN users u ON u.id = tm.user_id
WHERE u.deleted_at IS NULL;

-- Post overview with target counts
CREATE VIEW v_post_overview AS
SELECT
    p.id,
    p.team_id,
    p.title,
    p.status,
    p.created_at,
    p.published_at,
    COUNT(pt.id) AS target_count,
    COUNT(pt.id) FILTER (WHERE pt.status = 'published') AS published_count,
    COUNT(pt.id) FILTER (WHERE pt.status = 'failed') AS failed_count,
    ARRAY_AGG(DISTINCT sa.platform) AS platforms
FROM posts p
LEFT JOIN post_targets pt ON pt.post_id = p.id
LEFT JOIN social_accounts sa ON sa.id = pt.social_account_id
WHERE p.deleted_at IS NULL
GROUP BY p.id;

-- Unread inbox summary per team
CREATE VIEW v_inbox_summary AS
SELECT
    team_id,
    COUNT(*) FILTER (WHERE status = 'unread') AS unread_count,
    COUNT(*) FILTER (WHERE item_type = 'comment') AS comments,
    COUNT(*) FILTER (WHERE item_type = 'message') AS messages,
    COUNT(*) FILTER (WHERE item_type = 'mention') AS mentions
FROM inbox_items
WHERE deleted_at IS NULL
GROUP BY team_id;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE users IS 'Platform users with auth info. Soft-deleted via deleted_at.';
COMMENT ON TABLE user_oauth_accounts IS 'OAuth tokens per provider, separated from users for clean normalization.';
COMMENT ON TABLE user_sessions IS 'Active sessions. Tokens stored as hashes only.';
COMMENT ON TABLE teams IS 'Workspace/org unit. Billing and limits live here.';
COMMENT ON TABLE team_members IS 'Join table for users <-> teams with RBAC role.';
COMMENT ON TABLE social_accounts IS 'Connected platform accounts. Tokens encrypted at app layer.';
COMMENT ON TABLE posts IS 'Base content unit. A post can target multiple platforms.';
COMMENT ON TABLE post_targets IS 'Per-platform publishing record, one per social_account.';
COMMENT ON TABLE media_assets IS 'Media library. References cloud storage, not file data.';
COMMENT ON TABLE post_schedules IS 'Queue entries for the scheduler. Worker polls by scheduled_at + status.';
COMMENT ON TABLE publish_logs IS 'Immutable audit of every publish attempt.';
COMMENT ON TABLE analytics_snapshots IS 'Point-in-time engagement metrics per published post.';
COMMENT ON TABLE account_analytics IS 'Daily account-level metrics (followers, reach, etc).';
COMMENT ON TABLE inbox_items IS 'Unified inbox: comments, messages, mentions from all platforms.';
COMMENT ON TABLE inbox_replies IS 'Sent replies from within the platform.';
COMMENT ON TABLE ai_requests IS 'Logs every AI API call for cost tracking and debugging.';
COMMENT ON TABLE ai_suggestions IS 'Individual AI outputs (captions, hashtags, replies) with usage tracking.';
COMMENT ON TABLE notifications IS 'In-app notifications per user.';
COMMENT ON TABLE audit_logs IS 'Partitioned immutable event log. Never update/delete rows.';