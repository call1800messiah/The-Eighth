# Supabase Migration - Scratchpad

## Key Implementation Notes

- `person.liturgys` (Firebase typo) -> `person_liturgies` in migration script
- Combat path `combat/tKthlBKLy0JuVaPnXWzY/fighters` needs new UUID mapping
- TimelineService pagination: switch to offset/limit or cursor for Supabase
- Port config: 554xx (Windows reserves 54286-54385)

## Next Step Blockers

- Phase 3 validation requires Firebase service account to run
- Phase 4 export also requires Firebase service account

## Open Items

None.
