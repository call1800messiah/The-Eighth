-- Add the person capability junction tables to the realtime publication.
--
-- Capabilities (skills, spells, advantages, ...) are rows in these tables, not
-- columns on `people`, so writing one produces no change event on the watched
-- `people` row. PeopleService lists them in triggerTables, but without
-- publication membership there are no postgres_changes events to trigger on
-- and added or removed capabilities only appear after a full page reload.
--
-- person_attributes was already published (see 001); these are its siblings.

ALTER PUBLICATION supabase_realtime ADD TABLE
  person_advantages,
  person_cantrips,
  person_disadvantages,
  person_feats,
  person_liturgies,
  person_skills,
  person_spells;
