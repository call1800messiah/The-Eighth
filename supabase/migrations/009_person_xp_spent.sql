-- Track a person's spent adventure points next to the received ones (`xp`).
--
-- Nullable with no default: NULL means "not tracked", so the UI only shows
-- the spent points for people that have a value.

ALTER TABLE people ADD COLUMN xp_spent INTEGER;
