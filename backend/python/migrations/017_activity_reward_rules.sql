ALTER TABLE games_catalog ADD COLUMN daily_reward_limit INTEGER NOT NULL DEFAULT 1 CHECK (daily_reward_limit >= 0);
ALTER TABLE missions ADD COLUMN repeatable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE missions ADD COLUMN available_from DATE;
ALTER TABLE missions ADD COLUMN available_until DATE;
ALTER TABLE missions ADD CONSTRAINT mission_availability_dates CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from);
ALTER TABLE mission_submissions ADD COLUMN xp_awarded INTEGER CHECK (xp_awarded >= 0);
ALTER TABLE lesson_submissions ADD COLUMN xp_awarded INTEGER CHECK (xp_awarded >= 0);
ALTER TABLE game_sessions ADD COLUMN reward_date_key TEXT;
ALTER TABLE game_sessions ADD COLUMN xp_awarded INTEGER CHECK (xp_awarded >= 0);
UPDATE game_sessions SET reward_date_key=TO_CHAR(COALESCE(completed_at,created_at)::timestamptz AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') WHERE reward_granted=1;
CREATE INDEX game_daily_rewards ON game_sessions(user_id,game_type,reward_date_key) WHERE reward_granted=1;
CREATE TABLE mission_catalog_days (
    date_key TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE daily_missions (
    date_key TEXT NOT NULL REFERENCES mission_catalog_days(date_key),
    mission_id TEXT NOT NULL REFERENCES missions(id),
    PRIMARY KEY(date_key,mission_id)
);
