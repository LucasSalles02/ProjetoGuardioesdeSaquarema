CREATE TABLE home_highlight_settings (
    id INTEGER PRIMARY KEY CHECK (id=1),
    interval_seconds INTEGER NOT NULL DEFAULT 8 CHECK (interval_seconds BETWEEN 2 AND 300)
);
INSERT INTO home_highlight_settings(id,interval_seconds) VALUES (1,8);
