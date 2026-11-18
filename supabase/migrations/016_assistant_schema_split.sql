-- ============================================================================
-- 016: assistant_schema() without the value counts, and a stricter test of
--      which tables the assistant can read
-- ============================================================================
--
-- Two changes to migration 015:
--
-- 1. The values in use (`occurring`: tags, note categories, races, ...) move
--    out of assistant_schema() into assistant_column_values(table). They
--    change with every edit, so the MCP server reads them fresh whenever
--    Claude describes a table, while it caches the schema itself. Before, one
--    call counted every one of those columns, however little was needed.
--
-- 2. A table counts as readable when the assistant holds SELECT on it, a
--    PERMISSIVE SELECT/ALL policy for it calls is_assistant() without NOT, and
--    no RESTRICTIVE policy denies it outright with NOT is_assistant(). 015
--    matched any policy text containing "is_assistant()", so a permissive
--    policy granting everyone *but* the assistant listed the table.
--
--    The read policy must still call is_assistant() itself: a grant through a
--    helper function cannot be told from the policy text, and leaving the
--    table out is the safe side of that (see CLAUDE.md, "A table added later
--    gets no assistant policies").
--
-- One transaction, like 015.

BEGIN;

CREATE OR REPLACE FUNCTION public.assistant_schema() RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(jsonb_agg(t.tbl ORDER BY t.tbl->>'name'), '[]'::JSONB)
  FROM (
    SELECT jsonb_build_object(
      'name', c.relname,
      'note', obj_description(c.oid, 'pg_class'),
      'columns', (
        SELECT jsonb_agg(jsonb_build_object(
          'name', a.attname,
          'type', format_type(a.atttypid, a.atttypmod),
          'nullable', NOT a.attnotnull,
          'references', (
            SELECT rc.relname || '.' || ra.attname
            FROM pg_constraint k
            JOIN pg_class rc ON rc.oid = k.confrelid
            JOIN pg_attribute ra ON ra.attrelid = k.confrelid AND ra.attnum = k.confkey[1]
            WHERE k.conrelid = c.oid AND k.contype = 'f' AND k.conkey = ARRAY[a.attnum]
            LIMIT 1),
          'values', (
            SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
            FROM pg_enum e WHERE e.enumtypid = a.atttypid),
          'note', col_description(c.oid, a.attnum)
        ) ORDER BY a.attnum)
        FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped)
    ) AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND c.relname NOT LIKE 'mcp\_%'
      AND has_table_privilege(c.oid, 'SELECT')
      AND EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
          AND p.permissive = 'PERMISSIVE' AND p.cmd IN ('SELECT', 'ALL')
          AND p.roles && ARRAY['authenticated', 'public']::NAME[]
          AND p.qual ~ '(?<!NOT )is_assistant\(\)')
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
          AND p.permissive = 'RESTRICTIVE' AND p.cmd IN ('SELECT', 'ALL')
          AND p.roles && ARRAY['authenticated', 'public']::NAME[]
          AND p.qual = '( SELECT (NOT is_assistant()))')
  ) t;
$$;

-- The values in use in the free-text columns of one table, most frequent
-- first, at most 200 per column: {"column": [{"value": ..., "count": n}]}, or
-- {} for a table without such columns. Read with the caller's rights, so RLS
-- decides which rows are counted. Only the named table is scanned: each
-- branch's constant test is a one-time filter.
CREATE FUNCTION public.assistant_column_values(p_table TEXT) RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  WITH counted(col, value, n) AS (
              SELECT 'tag', tag, count(*) FROM person_tags WHERE p_table = 'person_tags' GROUP BY tag
    UNION ALL SELECT 'category', category, count(*) FROM notes WHERE p_table = 'notes' GROUP BY category
    UNION ALL SELECT 'race', race, count(*) FROM people WHERE p_table = 'people' GROUP BY race
    UNION ALL SELECT 'culture', culture, count(*) FROM people WHERE p_table = 'people' GROUP BY culture
    UNION ALL SELECT 'profession', profession, count(*) FROM people WHERE p_table = 'people' GROUP BY profession
    UNION ALL SELECT 'character', character, count(*) FROM inventory WHERE p_table = 'inventory' GROUP BY character
  ),
  ranked AS (
    SELECT *, row_number() OVER (PARTITION BY col ORDER BY n DESC, value) AS rank
    FROM counted WHERE value IS NOT NULL AND value <> ''
  ),
  per_column(col, vals) AS (
    SELECT col, jsonb_agg(jsonb_build_object('value', value, 'count', n) ORDER BY rank)
    FROM ranked WHERE rank <= 200
    GROUP BY col
  )
  SELECT COALESCE(jsonb_object_agg(col, vals), '{}'::JSONB) FROM per_column;
$$;

REVOKE ALL ON FUNCTION public.assistant_column_values(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assistant_column_values(TEXT) TO authenticated;

COMMIT;
