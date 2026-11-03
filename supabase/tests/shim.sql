-- Just enough of Supabase for the migrations to run on a plain Postgres:
-- the API roles, auth.uid() driven by a session setting, the realtime
-- publication, and the two storage tables the policies are written against.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT;
    GRANT anon, authenticated, service_role TO authenticator;
  END IF;
END;
$$;

CREATE SCHEMA auth;
CREATE TABLE auth.users (id UUID PRIMARY KEY);

-- PostgREST sets request.jwt.claims; the psql tests set request.jwt.claim.sub.
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::UUID
$$;

CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN 'anon' ELSE 'authenticated' END
$$;

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT NOT NULL, public BOOLEAN DEFAULT false);
CREATE TABLE storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT REFERENCES storage.buckets(id),
  name TEXT,
  owner UUID
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT ALL ON storage.objects TO anon, authenticated;

GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.role() TO anon, authenticated;

-- Supabase grants the API roles everything on public and leaves the rest to RLS.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

CREATE PUBLICATION supabase_realtime;

-- Test helpers.
CREATE SCHEMA test;
GRANT USAGE ON SCHEMA test TO anon, authenticated;

-- Acts as a signed-in user (NULL: anon) for the rest of the transaction.
CREATE FUNCTION test.login(p_user UUID) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_user::TEXT, ''), true);
  EXECUTE format('SET LOCAL ROLE %I', CASE WHEN p_user IS NULL THEN 'anon' ELSE 'authenticated' END);
END;
$$;
GRANT EXECUTE ON FUNCTION test.login(UUID) TO anon, authenticated;

CREATE FUNCTION test.eq(p_actual ANYELEMENT, p_expected ANYELEMENT, p_what TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_actual IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'FAIL %: expected %, got %', p_what, p_expected, p_actual;
  END IF;
  RAISE NOTICE 'ok   %', p_what;
END;
$$;
GRANT EXECUTE ON FUNCTION test.eq(ANYELEMENT, ANYELEMENT, TEXT) TO anon, authenticated;

-- Runs a statement that must fail with an RLS / privilege error.
CREATE FUNCTION test.denied(p_sql TEXT, p_what TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok   % (denied)', p_what;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL %: was allowed', p_what;
END;
$$;
GRANT EXECUTE ON FUNCTION test.denied(TEXT, TEXT) TO anon, authenticated;

-- Number of rows a statement changes; RLS hides rows rather than failing.
CREATE FUNCTION test.affected(p_sql TEXT) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE n INTEGER;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
GRANT EXECUTE ON FUNCTION test.affected(TEXT) TO anon, authenticated;
