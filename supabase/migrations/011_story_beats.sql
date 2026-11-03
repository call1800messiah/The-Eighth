-- Story beats: a GM-only spotlight tracker for the table.
--
-- During a session the GM logs a "beat" whenever a player character has a
-- meaningful moment. The tracker on the flow view shows, per PC, how long it has
-- been since their last beat and warns once that exceeds the session's interval.
--
-- A flow has exactly one beat session, since one flow is one played session. It
-- is created the first time it is started on the flow, and is then either running
-- or stopped for as long as the flow exists. There is no end state.
--
-- Time is measured on a session clock that does not run while the session is
-- stopped (breaks, dinner), so idle times do not run up in the meantime. Every
-- timestamp is taken from the database (NOW()) inside the functions below,
-- never from a browser, so two GM tabs with skewed clocks agree on the clock.
--
-- A session nobody has touched for four hours is taken to be forgotten. There
-- is no job running in the database, so the tracker calls stop_idle_beat_session()
-- while it is open. That stops the session as of the moment the four hours were
-- up, so the time until someone next opens the flow does not count.
--
-- Players never see any of this: both tables are GM-only.

CREATE TABLE beat_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (interval_minutes BETWEEN 5 AND 480),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at        TIMESTAMPTZ,                 -- set while stopped
  paused_seconds   INTEGER NOT NULL DEFAULT 0 CHECK (paused_seconds >= 0), -- completed stops
  -- PCs whose player is absent this session; they are hidden, not tracked.
  muted_person_ids UUID[] NOT NULL DEFAULT '{}',
  owner_id         UUID DEFAULT auth.uid() REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  flow_id          UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  -- Last start or logged beat: what the four hours are counted from.
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT beat_sessions_one_per_flow UNIQUE (flow_id)
);

CREATE TABLE story_beats (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL REFERENCES beat_sessions(id) ON DELETE CASCADE,
  person_id      UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  -- Chosen when logging. Extend the list with a migration.
  kind           TEXT CHECK (kind IN ('combat', 'discovery', 'general', 'lore', 'skill', 'social')),
  -- Session clock reading (stopped time excluded) when the beat was logged.
  active_seconds INTEGER NOT NULL CHECK (active_seconds >= 0),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_story_beats_session_person ON story_beats(session_id, person_id, active_seconds DESC);

-- DELETE payloads carry the whole row.
ALTER TABLE story_beats REPLICA IDENTITY FULL;
ALTER TABLE beat_sessions REPLICA IDENTITY FULL;

-- ============================================================================
-- SESSION CLOCK
-- ============================================================================

-- Seconds of running session time between started_at and p_at.
CREATE OR REPLACE FUNCTION beat_session_active_seconds(s beat_sessions, p_at TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT GREATEST(0, FLOOR(
    EXTRACT(EPOCH FROM (p_at - s.started_at))
    - s.paused_seconds
    - CASE WHEN s.paused_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (GREATEST(p_at, s.paused_at) - s.paused_at))
        ELSE 0 END
  ))::INTEGER;
$$;

-- ============================================================================
-- RUNNING STATE
-- ============================================================================

-- The functions below are SECURITY INVOKER: RLS still decides who may call
-- them successfully. They exist only so NOW() comes from the database.

-- Creates the flow's session or starts its existing one again. The interval
-- only applies to a new session; an existing one keeps its own.
CREATE OR REPLACE FUNCTION start_beat_session(p_flow_id UUID, p_interval_minutes INTEGER DEFAULT 60)
RETURNS beat_sessions
LANGUAGE SQL
SET search_path = public, pg_temp
AS $$
  INSERT INTO beat_sessions (flow_id, interval_minutes)
  VALUES (p_flow_id, p_interval_minutes)
  ON CONFLICT (flow_id) DO UPDATE
  SET paused_seconds = beat_sessions.paused_seconds
        + COALESCE(FLOOR(EXTRACT(EPOCH FROM (NOW() - beat_sessions.paused_at)))::INTEGER, 0),
      paused_at = NULL,
      last_activity_at = NOW()
  RETURNING *;
$$;

CREATE FUNCTION stop_beat_session(p_session_id UUID)
RETURNS VOID
LANGUAGE SQL
SET search_path = public, pg_temp
AS $$
  UPDATE beat_sessions SET paused_at = NOW()
  WHERE id = p_session_id AND paused_at IS NULL;
$$;

CREATE FUNCTION stop_idle_beat_session(p_session_id UUID)
RETURNS VOID
LANGUAGE SQL
SET search_path = public, pg_temp
AS $$
  UPDATE beat_sessions SET paused_at = last_activity_at + INTERVAL '4 hours'
  WHERE id = p_session_id
    AND paused_at IS NULL
    AND last_activity_at <= NOW() - INTERVAL '4 hours';
$$;

CREATE OR REPLACE FUNCTION log_story_beat(p_session_id UUID, p_person_id UUID, p_kind TEXT DEFAULT NULL)
RETURNS story_beats
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session beat_sessions;
  v_beat story_beats;
BEGIN
  SELECT * INTO v_session FROM beat_sessions WHERE id = p_session_id AND paused_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Beat session % is not running', p_session_id;
  END IF;

  INSERT INTO story_beats (session_id, person_id, kind, active_seconds)
  VALUES (p_session_id, p_person_id, p_kind, beat_session_active_seconds(v_session, NOW()))
  RETURNING * INTO v_beat;

  UPDATE beat_sessions SET last_activity_at = NOW() WHERE id = p_session_id;

  RETURN v_beat;
END;
$$;

-- ============================================================================
-- RLS: GM only
-- ============================================================================

ALTER TABLE beat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY beat_sessions_gm_policy ON beat_sessions
  FOR ALL
  TO authenticated
  USING (is_gm())
  WITH CHECK (is_gm());

CREATE POLICY story_beats_gm_policy ON story_beats
  FOR ALL
  TO authenticated
  USING (is_gm())
  WITH CHECK (is_gm());

-- Functions are executable by PUBLIC by default, so revoking only from anon
-- would change nothing. RLS would reject anon anyway; this keeps the API
-- surface closed rather than relying on that.
REVOKE ALL ON FUNCTION beat_session_active_seconds(beat_sessions, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION start_beat_session(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION stop_beat_session(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION stop_idle_beat_session(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION log_story_beat(UUID, UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION beat_session_active_seconds(beat_sessions, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION start_beat_session(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION stop_beat_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION stop_idle_beat_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_story_beat(UUID, UUID, TEXT) TO authenticated;

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Keeps several GM tabs (laptop + tablet at the table) in sync.
ALTER PUBLICATION supabase_realtime ADD TABLE beat_sessions, story_beats;
