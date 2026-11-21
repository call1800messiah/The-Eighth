-- Add person_tags to the realtime publication.
--
-- A person's tags are rows in this junction table, not a column on `people`,
-- so adding or removing a tag produces no change event on the watched
-- `people` row. PeopleService lists it in triggerTables, but without
-- publication membership there are no postgres_changes events to trigger on
-- and the change only appears after a full page reload.
--
-- Same fix as 004 and 005. Not idempotent: ADD TABLE fails if the table is
-- already a member.

ALTER PUBLICATION supabase_realtime ADD TABLE person_tags;
