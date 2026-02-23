-- Add metadata JSONB column to rules table.
--
-- The original schema only stored name, category, and description.
-- All type-specific fields (cost, castingTime, attributeOne, etc.) were lost
-- during migration. A JSONB column accommodates the varying shapes of each
-- rule category without requiring individual nullable columns per field.

ALTER TABLE rules ADD COLUMN IF NOT EXISTS metadata JSONB;
