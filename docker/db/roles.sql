-- Configure role passwords for Supabase services.
-- Runs as postgres superuser via /docker-entrypoint-initdb.d/init-scripts/.

\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER ROLE authenticator WITH PASSWORD :'pgpass';
ALTER ROLE supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER ROLE supabase_storage_admin WITH PASSWORD :'pgpass';
ALTER ROLE supabase_replication_admin WITH PASSWORD :'pgpass';
