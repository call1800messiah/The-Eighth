-- 018: In-game dates as a day number plus a precision.
--
-- <name>_day is a day on the campaign day line (0 = 1. Praios 1 BF), so dates
-- sort and subtract. <name>_precision says how much of it was known. The old
-- free-text columns are kept as *_legacy until a script has converted them.
-- The day columns are BIGINT: a year far before the epoch (people born
-- 100 000 000 v. BF) is beyond INTEGER once multiplied out to days.

-- ── campaign, historic_events ──────────────────────────────────────────────
ALTER TABLE campaign RENAME COLUMN date TO date_legacy;
ALTER TABLE campaign
  ADD COLUMN date_day BIGINT,
  ADD COLUMN date_precision TEXT CHECK (date_precision IN ('day', 'month', 'year')),
  ADD CONSTRAINT campaign_date_pair CHECK ((date_day IS NULL) = (date_precision IS NULL));

ALTER TABLE historic_events RENAME COLUMN date TO date_legacy;
ALTER TABLE historic_events
  ADD COLUMN date_day BIGINT,
  ADD COLUMN date_precision TEXT CHECK (date_precision IN ('day', 'month', 'year')),
  ADD CONSTRAINT historic_events_date_pair CHECK ((date_day IS NULL) = (date_precision IS NULL));

-- ── people ─────────────────────────────────────────────────────────────────
ALTER TABLE people RENAME COLUMN birthday TO birthday_legacy;
ALTER TABLE people RENAME COLUMN birthyear TO birthyear_legacy;
ALTER TABLE people RENAME COLUMN deathday TO deathday_legacy;
ALTER TABLE people
  ADD COLUMN birth_day BIGINT,
  ADD COLUMN birth_precision TEXT CHECK (birth_precision IN ('day', 'month', 'year')),
  ADD COLUMN death_day BIGINT,
  ADD COLUMN death_precision TEXT CHECK (death_precision IN ('day', 'month', 'year')),
  ADD CONSTRAINT people_birth_pair CHECK ((birth_day IS NULL) = (birth_precision IS NULL)),
  ADD CONSTRAINT people_death_pair CHECK ((death_day IS NULL) = (death_precision IS NULL));

CREATE INDEX idx_historic_events_timeline_date ON historic_events (timeline_id, date_day DESC NULLS LAST);

-- ── Comments (assistant_schema() hands these to Claude) ────────────────────
COMMENT ON COLUMN campaign.date_day IS 'In-game date as a day number on the campaign day line (0 = 1. Praios 1 BF); the calendars that name it are in the app''s rules.json. Sort by it. This is the current date: "today" in the campaign.';
COMMENT ON COLUMN campaign.date_precision IS 'How exact date_day is: day, month or year (then date_day is the first day of that month/year).';
COMMENT ON COLUMN campaign.date_legacy IS 'Old free-text value that could not be converted yet; NULL once converted.';

COMMENT ON TABLE historic_events IS 'Entries of a timeline: in-game date (date_day + date_precision), type and Markdown content.';
COMMENT ON COLUMN historic_events.date_day IS 'In-game date as a day number on the campaign day line (0 = 1. Praios 1 BF); the calendars that name it are in the app''s rules.json. Sort by it.';
COMMENT ON COLUMN historic_events.date_precision IS 'How exact date_day is: day, month or year (then date_day is the first day of that month/year).';
COMMENT ON COLUMN historic_events.date_legacy IS 'Old free-text value that could not be converted yet; NULL once converted.';

COMMENT ON COLUMN people.birth_day IS 'In-game date of birth as a day number on the campaign day line (0 = 1. Praios 1 BF); the calendars that name it are in the app''s rules.json. Sort by it.';
COMMENT ON COLUMN people.birth_precision IS 'How exact birth_day is: day, month or year (then birth_day is the first day of that month/year).';
COMMENT ON COLUMN people.death_day IS 'In-game date of death as a day number on the campaign day line (0 = 1. Praios 1 BF); the calendars that name it are in the app''s rules.json. Sort by it. A person is dead if death_day or deathday_legacy is set.';
COMMENT ON COLUMN people.death_precision IS 'How exact death_day is: day, month or year (then death_day is the first day of that month/year).';
COMMENT ON COLUMN people.birthday_legacy IS 'Old free-text value that could not be converted yet; NULL once converted.';
COMMENT ON COLUMN people.birthyear_legacy IS 'Old birth year (a number) that could not be converted yet, together with birthday_legacy; NULL once converted.';
COMMENT ON COLUMN people.deathday_legacy IS 'Old free-text value that could not be converted yet; NULL once converted. A person is dead if death_day or deathday_legacy is set.';
