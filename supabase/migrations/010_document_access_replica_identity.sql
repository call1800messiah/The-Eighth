-- Fix realtime DELETE events not propagating for access revocation.
--
-- With the default REPLICA IDENTITY (DEFAULT), PostgreSQL only includes the
-- primary key in payload.old for DELETE events. This means:
--   1. The server-side filter `user_id=eq.{userId}` cannot be evaluated, so
--      DELETE events never reach the subscriber.
--   2. Even if they did, entity_type would be absent from payload.old, so the
--      Angular RealtimeService cannot determine which entity type to re-fetch.
--
-- REPLICA IDENTITY FULL makes PostgreSQL include ALL column values in the WAL
-- for every DELETE, so payload.old contains user_id and entity_type and the
-- existing realtime logic works correctly for both grants and revocations.

ALTER TABLE document_access REPLICA IDENTITY FULL;
