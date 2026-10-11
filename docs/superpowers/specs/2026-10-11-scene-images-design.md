# Scene Images — Design

Date: 2026-10-11
Status: approved in chat, pending spec review

## Goal

Users can upload scene images and tag the people that appear in them. Each
scene is access-controlled like any other entity. When a user opens a person,
they see the scenes that person appears in — but only the scenes they have
access to.

## Decisions

| Question | Decision |
|---|---|
| How strict is access control? | Row level only. Scene rows are protected by RLS; files live in the public `the-eighth` bucket under unguessable paths. A leaked URL stays viewable. |
| Where are scenes created/managed? | From the person page. No new route or nav entry. |
| Who may create scenes? | Any authenticated user. The creator owns the scene; GMs can manage all scenes. |
| Cropping? | None. The selected file is uploaded as-is. |

Access semantics follow the rest of the app: owner and GMs always see a scene;
anyone else needs a `document_access` row with `entity_type = 'scene'`. Access
to a person does **not** imply access to their scenes.

## Data model — `supabase/migrations/010_scenes.sql`

### Tables

```sql
CREATE TABLE scenes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image      TEXT NOT NULL DEFAULT '',   -- storage path; '' until upload completes
  caption    TEXT,
  owner_id   UUID DEFAULT auth.uid() REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scene_people (
  scene_id  UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (scene_id, person_id)
);
CREATE INDEX idx_scene_people_person ON scene_people(person_id);
```

`owner_id` matches the other entity tables (no cascade). `scene_people` gets `REPLICA IDENTITY FULL`
so DELETE payloads carry `person_id`.

### RLS

`scenes` (RLS enabled):
- **SELECT** `TO authenticated`: `owner_id = auth.uid() OR is_gm() OR EXISTS (document_access WHERE entity_type = 'scene' AND entity_id = scenes.id AND user_id = auth.uid())`
- **INSERT** `TO authenticated`: `WITH CHECK (owner_id = auth.uid() OR is_gm())`
- **UPDATE** `TO authenticated`: owner or GM (USING and WITH CHECK)
- **DELETE** `TO authenticated`: owner or GM

`scene_people` (RLS enabled):
- **SELECT** `TO authenticated`: `EXISTS (SELECT 1 FROM scenes WHERE id = scene_id)` — the subquery is itself filtered by the `scenes` SELECT policy, so visibility follows the parent.
- **INSERT / DELETE** `TO authenticated`: `EXISTS (SELECT 1 FROM scenes WHERE id = scene_id AND (owner_id = auth.uid() OR is_gm()))`

`is_entity_owner()` is redefined (`CREATE OR REPLACE`, full body copied from
002) with an added `WHEN 'scene' THEN SELECT owner_id … FROM scenes` case, so
non-GM owners can share their scenes through the existing `document_access`
policies.

### Storage

Files go to `scenes/<scene id>/<name>-<nanoid>.<ext>` via the existing
`StorageService.uploadFile` convention. New `storage.objects` policies
(INSERT, UPDATE, DELETE, `TO authenticated`), modelled on migration 006:

```sql
bucket_id = 'the-eighth'
AND split_part(name, '/', 1) = 'scenes'
AND (
  EXISTS (
    SELECT 1 FROM scenes
    WHERE owner_id = auth.uid()
    AND id::text = split_part(objects.name, '/', 2)
  )
  OR is_gm()
)
```

Read access is covered by the existing public-read policy.

### Realtime

Add `scenes` and `scene_people` to the `supabase_realtime` publication.

### Types

Regenerate `src/types/supabase.ts` so `scenes` and `scene_people` are valid
`TableName`s (needed for `ACCESS_CONTROLLED_TABLES` and `triggerTables`).

## Client

### Access-control registration
- `src/app/shared/utils/entity-type.ts`: add `scenes: 'scene'` to `ENTITY_TYPE_MAP`.
- `src/app/core/services/supabase-realtime.service.ts`: add `scenes: 'scene'` to `ACCESS_CONTROLLED_TABLES`, so grants/revocations re-fetch scene watches live.

### Model — `src/app/people/models/scene.ts`

```ts
export interface Scene {
  id: string;
  image: string;      // public URL (resolved via StorageService)
  caption: string;
  owner: string;
  people: string[];   // person ids
}
```

Exported from the people models barrel.

### `SceneService` — `src/app/people/services/scene.service.ts`

- `static collection = 'scenes'`
- `getScenesForPerson(personId): Observable<Scene[]>`
  - `realtime.watch('scenes', q => q.select('*, match:scene_people!inner(person_id), scene_people(person_id)').eq('match.person_id', personId).order('created_at'), 'scenes-' + personId, ['scene_people'])`
  - The aliased `!inner` embed filters to scenes containing the person while the second embed still returns every person in each scene.
  - Transforms rows: snake_case → camelCase, `owner_id` → `owner`, `scene_people` → `people`, image path → public URL; drops rows whose `image` is still `''`.
- `create(file: File, caption: string, personIds: string[]): Promise<void>`
  1. Insert the `scenes` row (`.select().single()`), get the id.
  2. Insert `scene_people` rows.
  3. `storage.uploadFile(file.name, file, 'scenes', { collection: 'scenes', attribute: 'image', id })`.
  4. If step 2 or 3 fails, delete the scene row (junction rows cascade) and rethrow.
- `update(sceneId, caption, personIds): Promise<void>` — updates the caption, deletes all `scene_people` rows for the scene, inserts the new set.
- `delete(scene): Promise<void>` — removes the storage file via `storage.delete('scenes', …, updateRef)`, then deletes the row. The file goes first because the storage DELETE policy needs the row to exist.

All calls check `{ data, error }` and throw on error.

### `EditSceneComponent` — `src/app/people/components/edit-scene/`

Popover child (`PopoverChild`, props `EditSceneProps { scene?: Scene; personId?: string }`).
- Create mode (no `scene`): file input (`accept="image/*"`, required), caption, people checklist. `personId` is preselected.
- Edit mode (`scene` given): caption and people only; no file input.
- People list: `PeopleService.getPeople()` (already RLS-scoped), sorted by name.
- Save disabled while uploading or when no person is selected; on success emits `dismissPopover(true)`.

### `ScenesComponent` — `src/app/people/components/scenes/`

Input: `scenes: Scene[]`. Renders a thumbnail grid; each thumbnail links to the
full image (`target="_blank"`) and shows the caption. For the scene owner or a
GM, each scene has a small action row: *Bearbeiten* (opens `EditSceneComponent`
in edit mode), *Zugriff regeln* (opens `EditAccessComponent` with
`collection: 'scenes'`, `documentId`, `ownerId`), *Löschen* (confirm, then
`SceneService.delete`).

### Person page

- `PersonComponent` subscribes to `SceneService.getScenesForPerson(person.id)` alongside `infos$` as `scenes$`.
- New tab `<app-tab-panel id="scenes" label="Szenen">` rendered only when `scenes$` has at least one entry.
- New menu entry *Szene hinzufügen* (not `restricted`) opening `EditSceneComponent` with `personId`.

Both new components are declared in `PeopleModule`.

## Error handling

- Failed create rolls back the row (see above); the popover stays open and logs the error, matching how `EditImageComponent` reports failures.
- Rows with an empty `image` (mid-upload or orphaned) are hidden by the transform.

## Testing

- `scene.service.spec.ts` (using `src/app/testing/supabase-test-helpers.ts`):
  - `getScenesForPerson` calls `watch` with all four arguments, including `['scene_people']`.
  - Transform maps fields and filters empty images.
  - `create` runs insert → junction insert → upload in order; on upload failure deletes the row.
  - `update` replaces junction rows; `delete` removes file before row.
- `edit-scene.component.spec.ts`: preselects `personId`; create vs. edit mode; save calls the right service method.
- `scenes.component.spec.ts`: renders thumbnails; action row only for owner/GM.
- `person.component.spec.ts`: provide a `SceneService` mock so the suite doesn't break.
- `npx tsc --noEmit -p tsconfig.app.json` and the full headless suite stay green.
- Manual, after `npm run db:reset`: a non-GM second user cannot see a scene until granted access; after a grant it appears live on the person page; after revocation it disappears.

## Out of scope

- Private bucket / signed URLs.
- A standalone scenes gallery or route.
- Cropping or resizing uploads.
