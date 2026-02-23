-- Add person_attributes to the realtime publication so that changes to
-- attributes (e.g. hitpoints during combat) trigger postgres_changes events.
-- Without this, the triggerTables mechanism in RealtimeService has no events
-- to listen to and attribute updates don't propagate in realtime.

ALTER PUBLICATION supabase_realtime ADD TABLE person_attributes;
