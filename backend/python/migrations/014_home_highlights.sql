CREATE TABLE home_highlights (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    target_kind TEXT NOT NULL CHECK (target_kind IN ('game','mission','module','lesson')),
    target_id TEXT NOT NULL,
    module_id TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    image_alt TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'blue' CHECK (color IN ('blue','green','yellow','red')),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX home_highlights_display ON home_highlights(active, sort_order);
UPDATE access_profiles SET permissions = permissions || '["highlights.read","highlights.create","highlights.update","highlights.delete"]'::jsonb WHERE id='ADMIN' AND system=TRUE;
