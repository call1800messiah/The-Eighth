# Supabase Migration - Scratchpad

## Decisions Made

- **Auth migration**: Manual password setup (small user base)
- **isGM property**: Computed in UserService from user_roles JOIN
- **Audio files**: List dynamically from Storage bucket
- **Timeline ownership**: Added owner_id to timelines table
- **Notes tags**: Removed (not used in this app)
- **Port config**: Changed from 543xx to 554xx (Windows reserves 54286-54385)

## Implementation Notes

### Firebase Typo
Firebase has `person.liturgys` (typo). PostgreSQL table is `person_liturgies`.
Migration script must handle: `person.liturgys` -> `person_liturgies`

### Combat Session ID
Firebase path `combat/tKthlBKLy0JuVaPnXWzY/fighters` uses non-UUID ID.
Migration must generate new UUID and create mapping.

### Pagination Pattern
TimelineService uses `limit()` with BehaviorSubject for "load more".
Supabase pattern will be different - consider offset/limit or cursor.

## Files Changed During Planning

- `.claude/plans/supabase-migration.md` - Main migration plan (comprehensive)

## Cross-References

This migration affects all feature modules:
- achievements, auth, combat, dice, flow, inventory, notes
- overview, people, places, projects, quests, rules

## Open Items

None - all decisions documented.
