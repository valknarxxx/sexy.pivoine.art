-- Gamification System Schema for Sexy Recordings Platform
-- Created: 2025-10-28
-- Description: Recording-focused gamification with time-weighted scoring

-- ====================
-- Table: sexy_recording_plays
-- ====================
-- Tracks when users play recordings (similar to video plays)
CREATE TABLE IF NOT EXISTS sexy_recording_plays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
    recording_id UUID NOT NULL REFERENCES sexy_recordings(id) ON DELETE CASCADE,
    duration_played INTEGER, -- Duration played in milliseconds
    completed BOOLEAN DEFAULT FALSE, -- True if >= 90% watched
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recording_plays_user ON sexy_recording_plays(user_id);
CREATE INDEX IF NOT EXISTS idx_recording_plays_recording ON sexy_recording_plays(recording_id);
CREATE INDEX IF NOT EXISTS idx_recording_plays_date ON sexy_recording_plays(date_created);

COMMENT ON TABLE sexy_recording_plays IS 'Tracks user playback of recordings for analytics and gamification';
COMMENT ON COLUMN sexy_recording_plays.completed IS 'True if user watched at least 90% of the recording';

-- ====================
-- Table: sexy_user_points
-- ====================
-- Tracks individual point-earning actions with timestamps for time-weighted scoring
CREATE TABLE IF NOT EXISTS sexy_user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- e.g., "RECORDING_CREATE", "RECORDING_PLAY", "COMMENT_CREATE"
    points INTEGER NOT NULL, -- Raw points earned
    recording_id UUID REFERENCES sexy_recordings(id) ON DELETE SET NULL, -- Optional reference
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_points_user ON sexy_user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_date ON sexy_user_points(date_created);
CREATE INDEX IF NOT EXISTS idx_user_points_action ON sexy_user_points(action);

COMMENT ON TABLE sexy_user_points IS 'Individual point-earning actions for gamification system';
COMMENT ON COLUMN sexy_user_points.action IS 'Type of action: RECORDING_CREATE, RECORDING_PLAY, RECORDING_COMPLETE, COMMENT_CREATE, RECORDING_FEATURED';
COMMENT ON COLUMN sexy_user_points.points IS 'Raw points before time-weighted decay calculation';

-- ====================
-- Table: sexy_achievements
-- ====================
-- Predefined achievement definitions
CREATE TABLE IF NOT EXISTS sexy_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Unique identifier (e.g., "first_recording", "recording_100")
    name VARCHAR(255) NOT NULL, -- Display name
    description TEXT, -- Achievement description
    icon VARCHAR(255), -- Icon identifier or emoji
    category VARCHAR(50) NOT NULL, -- e.g., "recordings", "playback", "social", "special"
    required_count INTEGER, -- Number of actions needed to unlock
    points_reward INTEGER DEFAULT 0, -- Bonus points awarded upon unlock
    sort INTEGER DEFAULT 0, -- Display order
    status VARCHAR(20) DEFAULT 'published' -- published, draft, archived
);

CREATE INDEX IF NOT EXISTS idx_achievements_category ON sexy_achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_code ON sexy_achievements(code);

COMMENT ON TABLE sexy_achievements IS 'Predefined achievement definitions for gamification';
COMMENT ON COLUMN sexy_achievements.code IS 'Unique code used in backend logic (e.g., first_recording, play_100)';
COMMENT ON COLUMN sexy_achievements.category IS 'Achievement category: recordings, playback, social, special';

-- ====================
-- Table: sexy_user_achievements
-- ====================
-- Junction table tracking unlocked achievements per user
CREATE TABLE IF NOT EXISTS sexy_user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES sexy_achievements(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0, -- Current progress toward unlocking
    date_unlocked TIMESTAMP WITH TIME ZONE, -- NULL if not yet unlocked
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON sexy_user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON sexy_user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON sexy_user_achievements(date_unlocked) WHERE date_unlocked IS NOT NULL;

COMMENT ON TABLE sexy_user_achievements IS 'Tracks which achievements users have unlocked';
COMMENT ON COLUMN sexy_user_achievements.progress IS 'Current progress (e.g., 7/10 recordings created)';
COMMENT ON COLUMN sexy_user_achievements.date_unlocked IS 'NULL if achievement not yet unlocked';

-- ====================
-- Table: sexy_user_stats
-- ====================
-- Cached aggregate statistics for efficient leaderboard queries
CREATE TABLE IF NOT EXISTS sexy_user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
    total_raw_points INTEGER DEFAULT 0, -- Sum of all points (no decay)
    total_weighted_points NUMERIC(10,2) DEFAULT 0, -- Time-weighted score for rankings
    recordings_count INTEGER DEFAULT 0, -- Number of published recordings
    playbacks_count INTEGER DEFAULT 0, -- Number of recordings played
    comments_count INTEGER DEFAULT 0, -- Number of comments on recordings
    achievements_count INTEGER DEFAULT 0, -- Number of unlocked achievements
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Cache timestamp
);

CREATE INDEX IF NOT EXISTS idx_user_stats_weighted ON sexy_user_stats(total_weighted_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_user ON sexy_user_stats(user_id);

COMMENT ON TABLE sexy_user_stats IS 'Cached user statistics for fast leaderboard queries';
COMMENT ON COLUMN sexy_user_stats.total_raw_points IS 'Sum of all points without time decay';
COMMENT ON COLUMN sexy_user_stats.total_weighted_points IS 'Time-weighted score using exponential decay (λ=0.005)';
COMMENT ON COLUMN sexy_user_stats.last_updated IS 'Timestamp for cache invalidation';

-- ====================
-- Insert Initial Achievements
-- ====================

-- 🎬 Recordings (Creation)
INSERT INTO sexy_achievements (code, name, description, icon, category, required_count, points_reward, sort) VALUES
('first_recording', 'First Recording', 'Create your first recording', '🎬', 'recordings', 1, 50, 1),
('recording_10', 'Recording Enthusiast', 'Create 10 recordings', '📹', 'recordings', 10, 100, 2),
('recording_50', 'Prolific Creator', 'Create 50 recordings', '🎥', 'recordings', 50, 500, 3),
('recording_100', 'Recording Master', 'Create 100 recordings', '🏆', 'recordings', 100, 1000, 4),
('featured_recording', 'Featured Creator', 'Get a recording featured', '⭐', 'recordings', 1, 200, 5)
ON CONFLICT (code) DO NOTHING;

-- ▶️ Playback (Consumption)
INSERT INTO sexy_achievements (code, name, description, icon, category, required_count, points_reward, sort) VALUES
('first_play', 'First Play', 'Play your first recording', '▶️', 'playback', 1, 25, 10),
('play_100', 'Active Player', 'Play 100 recordings', '🎮', 'playback', 100, 250, 11),
('play_500', 'Playback Enthusiast', 'Play 500 recordings', '🔥', 'playback', 500, 1000, 12),
('completionist_10', 'Completionist', 'Complete 10 recordings to 90%+', '✅', 'playback', 10, 100, 13),
('completionist_100', 'Super Completionist', 'Complete 100 recordings', '💯', 'playback', 100, 500, 14)
ON CONFLICT (code) DO NOTHING;

-- 💬 Social (Community)
INSERT INTO sexy_achievements (code, name, description, icon, category, required_count, points_reward, sort) VALUES
('first_comment', 'First Comment', 'Leave your first comment', '💬', 'social', 1, 25, 20),
('comment_50', 'Conversationalist', 'Leave 50 comments', '💭', 'social', 50, 200, 21),
('comment_250', 'Community Voice', 'Leave 250 comments', '📣', 'social', 250, 750, 22)
ON CONFLICT (code) DO NOTHING;

-- ⭐ Special (Milestones)
INSERT INTO sexy_achievements (code, name, description, icon, category, required_count, points_reward, sort) VALUES
('early_adopter', 'Early Adopter', 'Join in the first month', '🚀', 'special', 1, 500, 30),
('one_year', 'One Year Anniversary', 'Be a member for 1 year', '🎂', 'special', 1, 1000, 31),
('balanced_creator', 'Balanced Creator', '50 recordings + 100 plays', '⚖️', 'special', 1, 500, 32),
('top_10_rank', 'Top 10 Leaderboard', 'Reach top 10 on leaderboard', '🏅', 'special', 1, 2000, 33)
ON CONFLICT (code) DO NOTHING;

-- ====================
-- Verification Queries
-- ====================

-- Count tables created
SELECT
    'sexy_recording_plays' as table_name,
    COUNT(*) as row_count
FROM sexy_recording_plays
UNION ALL
SELECT 'sexy_user_points', COUNT(*) FROM sexy_user_points
UNION ALL
SELECT 'sexy_achievements', COUNT(*) FROM sexy_achievements
UNION ALL
SELECT 'sexy_user_achievements', COUNT(*) FROM sexy_user_achievements
UNION ALL
SELECT 'sexy_user_stats', COUNT(*) FROM sexy_user_stats;

-- Show created achievements
SELECT
    category,
    COUNT(*) as achievement_count
FROM sexy_achievements
GROUP BY category
ORDER BY category;
