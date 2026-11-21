-- Add achievement_people to the realtime publication.
--
-- The people linked to an achievement are rows in this junction table, not
-- columns on `achievements`, so linking or unlinking a person produces no
-- change event on the watched `achievements` row. AchievementService lists it
-- in triggerTables, but without publication membership there are no
-- postgres_changes events to trigger on and the change only appears after a
-- full page reload.
--
-- Same fix as 004 for the person capability tables.

ALTER PUBLICATION supabase_realtime ADD TABLE achievement_people;
