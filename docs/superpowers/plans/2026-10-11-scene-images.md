# Scene Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users upload scene images, tag the people in them, and see the scenes they have access to on each tagged person's page.

**Architecture:** A `scenes` table plus a `scene_people` junction, both behind RLS that mirrors the other entities (owner, GM, or a `document_access` grant with `entity_type = 'scene'`). Files live in the public bucket under `scenes/<scene id>/`. A `SceneService` in the people feature watches scenes per person over realtime; two popover/tab components on the person page create, show and manage them.

**Tech Stack:** Angular 22 (NgModules, `standalone: false`, zone.js), RxJS, Supabase (PostgreSQL RLS, Storage, Realtime), Jasmine + Karma.

**Spec:** `docs/superpowers/specs/2026-10-11-scene-images-design.md`

## Global Constraints

- Work on a branch `feature/scene-images` cut from `development`.
- All files LF line endings (`.gitattributes` enforces it; never commit CRLF).
- UI text is German, matching the rest of the app.
- Components: `changeDetection: ChangeDetectionStrategy.Eager`, `standalone: false`, declared in `PeopleModule`; services `providedIn: 'root'` with `inject()`.
- `api.from('<table>' as any)` casts; `.select().single()` results cast `as { data: any; error: any }`; check `error` on every call.
- No access filters in client queries — RLS scopes results.
- Every new table has RLS enabled; every policy has `TO authenticated`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verification commands: `npx tsc --noEmit -p tsconfig.app.json`; `ng test --watch=false --browsers=ChromeHeadless` (single file: add `--include='**/path/to/file.spec.ts'`).

## Deviations from the spec (refinements found while planning)

1. `SceneService.update` writes only the **difference** in tagged people instead of delete-all-then-insert. A tag on a person the editor cannot see is then never touched (see Review Focus 2).
2. The `scene_people` INSERT policy also requires the person to be visible to the inserter, so nobody can tag a person by guessing a UUID.
3. Uploaded files are named `scene.<ext>` (the storage service appends a nanoid). User file names with spaces or umlauts never reach storage.
4. `TabsComponent` learns to fall back to the first tab when the active panel disappears — otherwise deleting the last scene while the Szenen tab is open leaves an empty page.

## Review Focus

1. **The active Szenen tab vanishes** (last scene deleted, or access revoked live) → the page falls back to the first tab instead of showing nothing. Test: Task 4.
2. **Editing a scene that tags a person the editor cannot see** → that tag survives the save. Tests: Task 3 (`update` diff) and Task 5 (selection keeps hidden ids).
3. **Upload fails after the row was inserted** → the row is deleted, the popover stays open, and Speichern is enabled again. Tests: Task 3 (rollback) and Task 5 (saving resets).
4. **A non-image file, or a file name with spaces/umlauts/no extension** → non-images are rejected in the popover; stored names are always `scene.<safe ext>`. Tests: Task 3 (`fileName`) and Task 5 (`fileChanged`).
5. **A player with a `document_access` grant but neither owner nor GM** → sees the scene but no edit/access/delete buttons. Test: Task 6.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/010_scenes.sql` (create) | Tables, RLS, `is_entity_owner` scene case, storage policies, realtime publication |
| `src/types/supabase.ts` (regenerate) | Generated DB types incl. `scenes`, `scene_people` |
| `CLAUDE.md` (modify) | Table count in the Access Control section |
| `src/app/shared/utils/entity-type.ts` (modify) | `scenes → scene` |
| `src/app/core/services/supabase-realtime.service.ts` (modify) | `scenes` in `ACCESS_CONTROLLED_TABLES` |
| `src/app/people/models/scene.ts` (create) | `Scene` interface |
| `src/app/people/models/edit-scene-props.ts` (create) | Popover props |
| `src/app/people/models/index.ts` (modify) | Barrel exports |
| `src/app/people/services/scene.service.ts` (+ spec, create) | Watch, create, update, delete |
| `src/app/shared/components/tabs/tabs.component.ts` (+ spec, modify/create) | Fallback when active panel disappears |
| `src/app/people/components/edit-scene/*` (create) | Create/edit popover |
| `src/app/people/components/scenes/*` (create) | Thumbnail grid + manage actions |
| `src/app/people/components/person/person.component.{ts,html,spec.ts}` (modify) | Menu entry, Szenen tab |
| `src/app/people/people.module.ts` (modify) | Declarations |

---

### Task 1: Database migration and generated types

**Files:**
- Create: `supabase/migrations/010_scenes.sql`
- Regenerate: `src/types/supabase.ts`
- Modify: `CLAUDE.md` (the line `All 39 tables have RLS enabled; …`)

**Interfaces:**
- Produces: tables `scenes(id uuid, image text default '', caption text null, owner_id uuid default auth.uid(), created_at timestamptz)` and `scene_people(scene_id uuid, person_id uuid)`; `document_access.entity_type = 'scene'`; storage folder `scenes/<scene id>/`; `'scenes' | 'scene_people'` become members of `TableName` in the generated types.

- [ ] **Step 1: Create the branch**

```bash
git checkout development
git pull --ff-only
git checkout -b feature/scene-images
```

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/010_scenes.sql`:

```sql
-- Scene images: pictures tagged with the people that appear in them.
--
-- A scene is its own access-controlled entity: the owner and GMs always see
-- it, everyone else needs a document_access row with entity_type = 'scene'.
-- Seeing a person does not imply seeing their scenes. The person page lists
-- the scenes a person is tagged in, so scene_people visibility follows the
-- parent scene.
--
-- Files live in the public bucket under scenes/<scene id>/. As with every
-- other image, RLS protects the rows (and therefore the URLs), not the bytes
-- behind a URL that has already been handed out.

CREATE TABLE scenes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image      TEXT NOT NULL DEFAULT '', -- storage path; '' until the upload completes
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

-- DELETE payloads carry the whole row, not just the key.
ALTER TABLE scene_people REPLICA IDENTITY FULL;

-- ============================================================================
-- SCENES
-- ============================================================================

ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY scenes_select_policy ON scenes
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    is_gm() OR
    EXISTS (
      SELECT 1 FROM document_access
      WHERE entity_type = 'scene'
      AND entity_id = scenes.id
      AND user_id = auth.uid()
    )
  );

-- Any signed-in user may create scenes; owner_id defaults to the caller.
CREATE POLICY scenes_insert_policy ON scenes
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY scenes_update_policy ON scenes
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR is_gm())
  WITH CHECK (owner_id = auth.uid() OR is_gm());

CREATE POLICY scenes_delete_policy ON scenes
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR is_gm());

-- ============================================================================
-- SCENE PEOPLE
-- ============================================================================

ALTER TABLE scene_people ENABLE ROW LEVEL SECURITY;

-- The subquery is itself filtered by scenes_select_policy.
CREATE POLICY scene_people_select_policy ON scene_people
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM scenes WHERE scenes.id = scene_people.scene_id));

-- Only the scene's owner (or a GM) tags people, and only people they can see:
-- the people subquery is filtered by people_select_policy.
CREATE POLICY scene_people_insert_policy ON scene_people
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = scene_people.scene_id
      AND (scenes.owner_id = auth.uid() OR is_gm())
    )
    AND EXISTS (SELECT 1 FROM people WHERE people.id = scene_people.person_id)
  );

CREATE POLICY scene_people_delete_policy ON scene_people
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scenes
      WHERE scenes.id = scene_people.scene_id
      AND (scenes.owner_id = auth.uid() OR is_gm())
    )
  );

-- ============================================================================
-- SHARING
-- ============================================================================

-- Add the scene case so non-GM owners can share their scenes through the
-- document_access policies. CREATE OR REPLACE resets the function's settings,
-- so the search_path pinned in 007 is repeated here.
CREATE OR REPLACE FUNCTION is_entity_owner(p_entity_type TEXT, p_entity_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  CASE p_entity_type
    WHEN 'person'         THEN SELECT owner_id INTO v_owner_id FROM people WHERE id = p_entity_id;
    WHEN 'place'          THEN SELECT owner_id INTO v_owner_id FROM places WHERE id = p_entity_id;
    WHEN 'quest'          THEN SELECT owner_id INTO v_owner_id FROM quests WHERE id = p_entity_id;
    WHEN 'project'        THEN SELECT owner_id INTO v_owner_id FROM projects WHERE id = p_entity_id;
    WHEN 'achievement'    THEN SELECT owner_id INTO v_owner_id FROM achievements WHERE id = p_entity_id;
    WHEN 'inventory'      THEN SELECT owner_id INTO v_owner_id FROM inventory WHERE id = p_entity_id;
    WHEN 'note'           THEN SELECT owner_id INTO v_owner_id FROM notes WHERE id = p_entity_id;
    WHEN 'flow'           THEN SELECT owner_id INTO v_owner_id FROM flows WHERE id = p_entity_id;
    WHEN 'roll'           THEN SELECT owner_id INTO v_owner_id FROM rolls WHERE id = p_entity_id;
    WHEN 'info_box'       THEN SELECT owner_id INTO v_owner_id FROM info_boxes WHERE id = p_entity_id;
    WHEN 'scene'          THEN SELECT owner_id INTO v_owner_id FROM scenes WHERE id = p_entity_id;
    ELSE RETURN FALSE;
  END CASE;
  RETURN v_owner_id IS NOT NULL AND v_owner_id = auth.uid();
END;
$$;

-- ============================================================================
-- STORAGE: scenes/<scene id>/… belongs to the scene's owner
-- ============================================================================

-- Inside the subqueries the object path must be written objects.name (see 006).
CREATE POLICY "Users can upload scene files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
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
);

CREATE POLICY "Users can update scene files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
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
);

CREATE POLICY "Users can delete scene files"
ON storage.objects FOR DELETE
TO authenticated
USING (
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
);

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE scenes, scene_people;
```

- [ ] **Step 3: Apply it locally**

Requires Docker and the local Supabase stack (`npx supabase start` if it is not running).

Run: `npx supabase migration up --local`
Expected: `Applying migration 010_scenes.sql...` and no error.

- [ ] **Step 4: Check RLS with two non-GM users**

Write this to the scratchpad as `scene-rls-check.sql` (not into the repo):

```sql
BEGIN;
SELECT set_config('t.a', (SELECT id::text FROM users WHERE id NOT IN (SELECT user_id FROM user_roles WHERE role = 'gm') ORDER BY id LIMIT 1), true);
SELECT set_config('t.b', (SELECT id::text FROM users WHERE id NOT IN (SELECT user_id FROM user_roles WHERE role = 'gm') ORDER BY id OFFSET 1 LIMIT 1), true);
SET LOCAL ROLE authenticated;

-- user A creates a scene
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.a'), 'role', 'authenticated')::text, true);
INSERT INTO scenes (caption) VALUES ('rls-check') RETURNING id AS scene_id \gset

-- user B cannot see it, cannot tag into it
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.b'), 'role', 'authenticated')::text, true);
SELECT count(*) AS b_sees_before FROM scenes WHERE id = :'scene_id';

-- A shares it with B
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.a'), 'role', 'authenticated')::text, true);
INSERT INTO document_access (entity_type, entity_id, user_id) VALUES ('scene', :'scene_id', current_setting('t.b')::uuid);

-- B sees it now, but still cannot update it
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.b'), 'role', 'authenticated')::text, true);
SELECT count(*) AS b_sees_after FROM scenes WHERE id = :'scene_id';
UPDATE scenes SET caption = 'hijacked' WHERE id = :'scene_id';
ROLLBACK;
```

Run: `docker exec -i supabase_db_The-Eighth psql -U postgres -d postgres < <scratchpad>/scene-rls-check.sql`
Expected: `b_sees_before` = 0, the document_access insert succeeds (`INSERT 0 1`), `b_sees_after` = 1, `UPDATE 0`.

- [ ] **Step 5: Regenerate the types**

Run: `npx supabase gen types typescript --local > src/types/supabase.ts`
Then check: `git diff --stat src/types/supabase.ts` shows changes and `grep -n "scene_people:" src/types/supabase.ts` finds the new table. If the file was written as UTF-16/CRLF by PowerShell redirection, rerun the command from Git Bash.

- [ ] **Step 6: Update CLAUDE.md**

In the Access Control section change `All 39 tables have RLS enabled; policies live in \`supabase/migrations/002_rls_policies.sql\`` to:

```markdown
- All 41 tables have RLS enabled; policies live in `supabase/migrations/002_rls_policies.sql` and later migrations (`010_scenes.sql` for scenes)
```

- [ ] **Step 7: Type-check and commit**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no output.

```bash
git add supabase/migrations/010_scenes.sql src/types/supabase.ts CLAUDE.md
git commit -m "Add scenes and scene_people tables with RLS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Register scenes as an access-controlled entity

**Files:**
- Modify: `src/app/shared/utils/entity-type.ts`
- Modify: `src/app/core/services/supabase-realtime.service.ts` (`ACCESS_CONTROLLED_TABLES`)
- Create: `src/app/shared/utils/entity-type.spec.ts`

**Interfaces:**
- Consumes: `'scenes'` as a `TableName` (Task 1).
- Produces: `getEntityType('scenes') === 'scene'`; watches on `scenes` re-fetch when a `scene` grant changes.

- [ ] **Step 1: Write the failing test**

Create `src/app/shared/utils/entity-type.spec.ts`:

```ts
import { getEntityType } from './entity-type';

describe('getEntityType', () => {
  it('maps scenes to scene', () => {
    expect(getEntityType('scenes')).toBe('scene');
  });

  it('maps people to person', () => {
    expect(getEntityType('people')).toBe('person');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/shared/utils/entity-type.spec.ts'`
Expected: FAIL — `Expected 'scenes' to be 'scene'.`

- [ ] **Step 3: Add the mappings**

In `src/app/shared/utils/entity-type.ts`, add after `info_boxes: 'info_box',`:

```ts
  scenes: 'scene',
```

In `src/app/core/services/supabase-realtime.service.ts`, add after `info_boxes:      'info_box',` in `ACCESS_CONTROLLED_TABLES`:

```ts
  scenes:          'scene',
```

- [ ] **Step 4: Run the test and type-check**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/shared/utils/entity-type.spec.ts'` → PASS
Run: `npx tsc --noEmit -p tsconfig.app.json` → no output

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/utils/entity-type.ts src/app/shared/utils/entity-type.spec.ts src/app/core/services/supabase-realtime.service.ts
git commit -m "Treat scenes as an access-controlled entity

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Scene model and SceneService

**Files:**
- Create: `src/app/people/models/scene.ts`
- Create: `src/app/people/models/edit-scene-props.ts`
- Modify: `src/app/people/models/index.ts`
- Create: `src/app/people/services/scene.service.ts`
- Test: `src/app/people/services/scene.service.spec.ts`

**Interfaces:**
- Consumes: `RealtimeService.watch(table, queryFn, cacheKey, triggerTables)`, `StorageService.uploadFile(name, file, bucket, updateRef)`, `StorageService.delete(bucket, fileName, updateRef)`, `StorageService.getDownloadURL(path): Observable<string>`, `ApiService.from(table)`.
- Produces:
  - `interface Scene { id: string; image: string; caption: string; owner: string; people: string[] }`
  - `interface EditSceneProps { scene?: Scene; personId?: string }`
  - `SceneService.collection = 'scenes'`
  - `getScenesForPerson(personId: string): Observable<Scene[]>`
  - `create(file: File, caption: string, personIds: string[]): Promise<void>`
  - `update(scene: Scene, caption: string, personIds: string[]): Promise<void>`
  - `delete(scene: Scene): Promise<void>`
  - `static fileName(file: File): string`

- [ ] **Step 1: Add the models**

`src/app/people/models/scene.ts`:

```ts
export interface Scene {
  id: string;
  /** Public URL of the image */
  image: string;
  caption: string;
  owner: string;
  /** Ids of the people tagged in the scene */
  people: string[];
}
```

`src/app/people/models/edit-scene-props.ts`:

```ts
import type { Scene } from './scene';

export interface EditSceneProps {
  /** Set when editing; omitted when creating */
  scene?: Scene;
  /** Preselected person when creating from a person page */
  personId?: string;
}
```

In `src/app/people/models/index.ts` add, keeping alphabetical order:

```ts
export * from './edit-scene-props';
```
(after `export * from './edit-capability-props';`) and

```ts
export * from './scene';
```
(after `export * from './relative';`).

- [ ] **Step 2: Write the failing spec**

`src/app/people/services/scene.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';

import type { Scene } from '../models';
import { SceneService } from './scene.service';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { StorageService } from '../../core/services/storage.service';
import {
  createMockApiService,
  createMockQueryBuilder,
  createMockRealtimeService,
  createMockStorageService,
} from '../../testing/supabase-test-helpers';

describe('SceneService', () => {
  let service: SceneService;
  let mockApi: ReturnType<typeof createMockApiService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;
  let mockStorage: ReturnType<typeof createMockStorageService>;

  const scene: Scene = {
    id: 'scene-1',
    image: 'https://example.com/scenes/scene-1/scene-abc.jpg',
    caption: 'Am Lagerfeuer',
    owner: 'user-1',
    people: ['p1', 'p2', 'hidden'],
  };

  beforeEach(() => {
    mockApi = createMockApiService();
    mockRealtime = createMockRealtimeService();
    mockStorage = createMockStorageService();

    TestBed.configureTestingModule({
      providers: [
        SceneService,
        { provide: ApiService, useValue: mockApi },
        { provide: RealtimeService, useValue: mockRealtime },
        { provide: StorageService, useValue: mockStorage },
      ],
    });
    service = TestBed.inject(SceneService);
  });

  describe('getScenesForPerson', () => {
    it('watches scenes with a per-person cache key and scene_people as trigger', () => {
      service.getScenesForPerson('p1').subscribe();

      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'scenes',
        jasmine.any(Function),
        'scenes-p1',
        ['scene_people'],
      );
    });

    it('filters on the tagged person through an inner-joined alias', () => {
      service.getScenesForPerson('p1').subscribe();
      const queryFn = mockRealtime.watch.calls.mostRecent().args[1];
      const builder = createMockQueryBuilder();

      queryFn(builder);

      expect(builder.select).toHaveBeenCalledWith('*, match:scene_people!inner(person_id), scene_people(person_id)');
      expect(builder.eq).toHaveBeenCalledWith('match.person_id', 'p1');
    });

    it('maps rows to scenes and hides rows whose upload has not finished', () => {
      let result: Scene[] = [];
      service.getScenesForPerson('p1').subscribe(scenes => result = scenes);

      mockRealtime.emitRows('scenes-p1', [
        {
          id: 'scene-1', image: 'scenes/scene-1/scene-abc.jpg', caption: null, owner_id: 'user-1',
          match: [{ person_id: 'p1' }], scene_people: [{ person_id: 'p1' }, { person_id: 'p2' }],
        },
        { id: 'scene-2', image: '', caption: 'leer', owner_id: 'user-1', match: [], scene_people: [] },
      ]);

      expect(result).toEqual([{
        id: 'scene-1',
        image: 'https://example.com/scenes/scene-1/scene-abc.jpg',
        caption: '',
        owner: 'user-1',
        people: ['p1', 'p2'],
      }]);
    });
  });

  describe('create', () => {
    it('inserts the row, tags the people, then uploads into the scene folder', async () => {
      const sceneInsert = createMockQueryBuilder({ data: { id: 'new-scene' } });
      const peopleInsert = createMockQueryBuilder();
      mockApi.from.and.returnValues(sceneInsert, peopleInsert);
      const file = new File(['x'], 'Mein Bild.JPG', { type: 'image/jpeg' });

      await service.create(file, ' Am Fluss ', ['p1', 'p2']);

      expect(mockApi.from.calls.argsFor(0)).toEqual(['scenes']);
      expect(sceneInsert.insert).toHaveBeenCalledWith({ caption: 'Am Fluss' });
      expect(mockApi.from.calls.argsFor(1)).toEqual(['scene_people']);
      expect(peopleInsert.insert).toHaveBeenCalledWith([
        { scene_id: 'new-scene', person_id: 'p1' },
        { scene_id: 'new-scene', person_id: 'p2' },
      ]);
      expect(mockStorage.uploadFile).toHaveBeenCalledWith(
        'scene.jpg', file, 'scenes', { collection: 'scenes', attribute: 'image', id: 'new-scene' },
      );
    });

    it('deletes the row again when the upload fails', async () => {
      const sceneInsert = createMockQueryBuilder({ data: { id: 'new-scene' } });
      const peopleInsert = createMockQueryBuilder();
      const rollback = createMockQueryBuilder();
      mockApi.from.and.returnValues(sceneInsert, peopleInsert, rollback);
      mockStorage.uploadFile.and.returnValue(Promise.reject(new Error('upload failed')));
      const file = new File(['x'], 'bild.png', { type: 'image/png' });

      await expectAsync(service.create(file, '', ['p1'])).toBeRejectedWithError('upload failed');

      expect(mockApi.from.calls.argsFor(2)).toEqual(['scenes']);
      expect(rollback.delete).toHaveBeenCalled();
      expect(rollback.eq).toHaveBeenCalledWith('id', 'new-scene');
    });

    it('throws without uploading when the row insert fails', async () => {
      mockApi.from.and.returnValue(createMockQueryBuilder({ error: { message: 'denied' } }));
      const file = new File(['x'], 'bild.png', { type: 'image/png' });

      await expectAsync(service.create(file, '', ['p1'])).toBeRejected();

      expect(mockStorage.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the caption and only writes the changed tags', async () => {
      const captionUpdate = createMockQueryBuilder();
      const tagDelete = createMockQueryBuilder();
      const tagInsert = createMockQueryBuilder();
      mockApi.from.and.returnValues(captionUpdate, tagDelete, tagInsert);

      // p2 removed, p3 added, p1 and 'hidden' untouched
      await service.update(scene, 'Neu', ['p1', 'hidden', 'p3']);

      expect(captionUpdate.update).toHaveBeenCalledWith({ caption: 'Neu' });
      expect(captionUpdate.eq).toHaveBeenCalledWith('id', 'scene-1');
      expect(tagDelete.delete).toHaveBeenCalled();
      expect(tagDelete.eq).toHaveBeenCalledWith('scene_id', 'scene-1');
      expect(tagDelete.in).toHaveBeenCalledWith('person_id', ['p2']);
      expect(tagInsert.insert).toHaveBeenCalledWith([{ scene_id: 'scene-1', person_id: 'p3' }]);
    });

    it('skips the tag writes when the people did not change', async () => {
      mockApi.from.and.returnValue(createMockQueryBuilder());

      await service.update(scene, 'Neu', ['hidden', 'p2', 'p1']);

      expect(mockApi.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('removes the file before the row', async () => {
      const rowDelete = createMockQueryBuilder();
      mockApi.from.and.returnValue(rowDelete);
      mockStorage.delete.and.callFake(() => {
        expect(rowDelete.delete).not.toHaveBeenCalled();
        return Promise.resolve();
      });

      await service.delete(scene);

      expect(mockStorage.delete).toHaveBeenCalledWith(
        'scenes', '', { collection: 'scenes', attribute: 'image', id: 'scene-1' },
      );
      expect(rowDelete.delete).toHaveBeenCalled();
      expect(rowDelete.eq).toHaveBeenCalledWith('id', 'scene-1');
    });
  });

  describe('fileName', () => {
    it('keeps a safe lower-case extension', () => {
      expect(SceneService.fileName(new File([], 'Mein Bild.JPG'))).toBe('scene.jpg');
    });

    it('falls back to jpg for missing or odd extensions', () => {
      expect(SceneService.fileName(new File([], 'ohne-endung'))).toBe('scene.jpg');
      expect(SceneService.fileName(new File([], 'bild.jp g'))).toBe('scene.jpg');
      expect(SceneService.fileName(new File([], 'bild.äöü'))).toBe('scene.jpg');
    });
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/people/services/scene.service.spec.ts'`
Expected: FAIL — compile error `Cannot find module './scene.service'`.

- [ ] **Step 4: Implement the service**

`src/app/people/services/scene.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Scene } from '../models';
import type { FileUpdateRef } from '../../core/models/file-update-ref';
import { ApiService } from '../../core/services/api.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { StorageService } from '../../core/services/storage.service';



@Injectable({
  providedIn: 'root'
})
export class SceneService {
  private api = inject(ApiService);
  private realtime = inject(RealtimeService);
  private storage = inject(StorageService);

  static readonly collection = 'scenes';
  private static readonly bucket = 'scenes';



  /**
   * Scenes the given person is tagged in, limited by RLS to those the current
   * user may see. The `match` alias is inner-joined to filter by person; the
   * plain `scene_people` embed still returns everyone in each scene.
   */
  getScenesForPerson(personId: string): Observable<Scene[]> {
    return this.realtime.watch<any>(
      'scenes',
      // `any`: the typed select parser does not follow the aliased embed filter
      (query: any) => query
        .select('*, match:scene_people!inner(person_id), scene_people(person_id)')
        .eq('match.person_id', personId)
        .order('created_at'),
      `scenes-${personId}`,
      ['scene_people'],
    ).pipe(
      // A row without an image is still uploading, or its upload failed
      map(rows => rows.filter(row => row.image).map(row => this.transform(row))),
    );
  }


  async create(file: File, caption: string, personIds: string[]): Promise<void> {
    const { data, error } = await this.api.from('scenes' as any)
      .insert({ caption: caption.trim() || null })
      .select()
      .single() as { data: any; error: any };
    if (error) {
      throw error;
    }

    try {
      await this.insertPeople(data.id, personIds);
      // The storage policy only lets the owner write into scenes/<id>/, so the
      // row has to exist before the upload
      await this.storage.uploadFile(SceneService.fileName(file), file, SceneService.bucket, this.imageRef(data.id));
    } catch (uploadError) {
      await this.api.from('scenes' as any).delete().eq('id', data.id);
      throw uploadError;
    }
  }


  /**
   * Writes only the tags that changed, so a tag on a person the editor cannot
   * see is never touched.
   */
  async update(scene: Scene, caption: string, personIds: string[]): Promise<void> {
    const { error } = await this.api.from('scenes' as any)
      .update({ caption: caption.trim() || null })
      .eq('id', scene.id);
    if (error) {
      throw error;
    }

    const removed = scene.people.filter(id => !personIds.includes(id));
    const added = personIds.filter(id => !scene.people.includes(id));

    if (removed.length > 0) {
      const { error: deleteError } = await this.api.from('scene_people' as any)
        .delete()
        .eq('scene_id', scene.id)
        .in('person_id', removed);
      if (deleteError) {
        throw deleteError;
      }
    }
    await this.insertPeople(scene.id, added);
  }


  /**
   * The file goes first: the storage delete policy needs the row to exist.
   * The tags are removed by ON DELETE CASCADE.
   */
  async delete(scene: Scene): Promise<void> {
    await this.storage.delete(SceneService.bucket, '', this.imageRef(scene.id));
    const { error } = await this.api.from('scenes' as any)
      .delete()
      .eq('id', scene.id);
    if (error) {
      throw error;
    }
  }


  /**
   * The user's file name never reaches storage: it may contain characters
   * storage keys reject, and it is nobody else's business.
   */
  static fileName(file: File): string {
    const dot = file.name.lastIndexOf('.');
    const extension = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '';
    return `scene.${/^[a-z0-9]{1,5}$/.test(extension) ? extension : 'jpg'}`;
  }


  private imageRef(sceneId: string): FileUpdateRef {
    return { collection: SceneService.collection, attribute: 'image', id: sceneId };
  }


  private async insertPeople(sceneId: string, personIds: string[]): Promise<void> {
    if (personIds.length === 0) {
      return;
    }
    const { error } = await this.api.from('scene_people' as any)
      .insert(personIds.map(personId => ({ scene_id: sceneId, person_id: personId })));
    if (error) {
      throw error;
    }
  }


  private transform(row: any): Scene {
    let image = '';
    // getDownloadURL emits synchronously (public URL), see StorageService
    this.storage.getDownloadURL(row.image).subscribe(url => image = url);
    return {
      id: row.id,
      image,
      caption: row.caption ?? '',
      owner: row.owner_id,
      people: (row.scene_people ?? []).map((tag: any) => tag.person_id),
    };
  }
}
```

Check that `FileUpdateRef` is at `src/app/core/models/file-update-ref.ts` and has exactly `collection`, `attribute`, `id` (StorageService imports it from `../models/file-update-ref`). If its field names differ, use them in `imageRef` and in the spec.

- [ ] **Step 5: Run the spec**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/people/services/scene.service.spec.ts'`
Expected: all SceneService specs PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/people/models src/app/people/services/scene.service.ts src/app/people/services/scene.service.spec.ts
git commit -m "Add SceneService for scene images

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Tabs fall back when the active panel disappears

**Files:**
- Modify: `src/app/shared/components/tabs/tabs.component.ts`
- Create: `src/app/shared/components/tabs/tabs.component.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: unchanged public API (`defaultTab`, `tabChange`, `selectTab`, `activeTabId`). New behaviour: when the active panel is removed, the first remaining panel becomes active.

- [ ] **Step 1: Write the failing spec**

`src/app/shared/components/tabs/tabs.component.spec.ts`:

```ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { TabsComponent } from './tabs.component';
import { TabPanelComponent } from './tab-panel.component';

@Component({
  template: `
    <app-tabs>
      <app-tab-panel id="a" label="A">Inhalt A</app-tab-panel>
      @if (showB) {
        <app-tab-panel id="b" label="B">Inhalt B</app-tab-panel>
      }
    </app-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
class HostComponent {
  showB = true;
}

describe('TabsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let tabs: TabsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HostComponent, TabsComponent, TabPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    tabs = fixture.debugElement.query(By.directive(TabsComponent)).componentInstance;
  });

  it('activates the first panel', () => {
    expect(tabs.activeTabId).toBe('a');
    expect(fixture.nativeElement.textContent).toContain('Inhalt A');
  });

  it('falls back to the first panel when the active one disappears', async () => {
    tabs.selectTab('b');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Inhalt B');

    fixture.componentInstance.showB = false;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(tabs.activeTabId).toBe('a');
    expect(fixture.nativeElement.textContent).toContain('Inhalt A');
  });

  it('keeps the active panel when another one appears', async () => {
    fixture.componentInstance.showB = false;
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.showB = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(tabs.activeTabId).toBe('a');
    expect(fixture.nativeElement.textContent).not.toContain('Inhalt B');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/shared/components/tabs/tabs.component.spec.ts'`
Expected: `falls back to the first panel…` FAILS (`Expected 'b' to be 'a'`); the other two pass.

- [ ] **Step 3: Implement the fallback**

Replace the class body's `ngAfterContentInit` in `src/app/shared/components/tabs/tabs.component.ts` and add the imports:

```ts
import { AfterContentInit, Component, ContentChildren, DestroyRef, EventEmitter, Input, Output, QueryList, ChangeDetectionStrategy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TabPanelComponent } from './tab-panel.component';
```

```ts
export class TabsComponent implements AfterContentInit {
  private destroyRef = inject(DestroyRef);

  @ContentChildren(TabPanelComponent) tabPanels: QueryList<TabPanelComponent>;

  @Input() defaultTab?: string;
  @Output() tabChange = new EventEmitter<string>();

  activeTabId: string;

  ngAfterContentInit(): void {
    this.activateDefaultTab();

    // Panels behind @if come and go (e.g. Szenen once the last scene is gone).
    // The query updates while the parent view is checked, so the switch is
    // deferred to the next turn to avoid ExpressionChangedAfterItHasBeenChecked.
    this.tabPanels.changes.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      if (!this.tabPanels.some(panel => panel.id === this.activeTabId)) {
        Promise.resolve().then(() => this.activateDefaultTab());
      }
    });
  }

  selectTab(tabId: string): void {
    if (tabId !== this.activeTabId) {
      this.activeTabId = tabId;
      this.updatePanelVisibility();
      this.tabChange.emit(tabId);
    }
  }

  private activateDefaultTab(): void {
    if (this.tabPanels.length > 0) {
      const defaultPanel = this.defaultTab
        ? this.tabPanels.find(p => p.id === this.defaultTab)
        : null;
      this.activeTabId = defaultPanel?.id || this.tabPanels.first.id;
      this.updatePanelVisibility();
    }
  }

  private updatePanelVisibility(): void {
    this.tabPanels.forEach(panel => {
      panel.isActive = panel.id === this.activeTabId;
    });
  }
}
```

- [ ] **Step 4: Run the spec**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/shared/components/tabs/tabs.component.spec.ts'`
Expected: 3 PASS, and no `NG0100` error in the output.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/components/tabs
git commit -m "Fall back to the first tab when the active panel disappears

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: EditSceneComponent (create and edit popover)

**Files:**
- Create: `src/app/people/components/edit-scene/edit-scene.component.ts`
- Create: `src/app/people/components/edit-scene/edit-scene.component.html`
- Create: `src/app/people/components/edit-scene/edit-scene.component.scss`
- Test: `src/app/people/components/edit-scene/edit-scene.component.spec.ts`
- Modify: `src/app/people/people.module.ts` (declare `EditSceneComponent`)

**Interfaces:**
- Consumes: `SceneService.create(file, caption, personIds)`, `SceneService.update(scene, caption, personIds)`, `PeopleService.getPeople(): Observable<Person[]>`, `EditSceneProps`, `UtilService.orderByName` (static).
- Produces: `EditSceneComponent` (`selector: 'app-edit-scene'`, implements `PopoverChild`), public members `caption`, `file`, `fileInvalid`, `saving`, `selected: Set<string>`, `canSave`, `fileChanged(event)`, `toggle(personId, checked)`, `save(): Promise<void>`.

- [ ] **Step 1: Write the failing spec**

`src/app/people/components/edit-scene/edit-scene.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import type { Scene } from '../../models';
import { EditSceneComponent } from './edit-scene.component';
import { SceneService } from '../../services/scene.service';
import { PeopleService } from '../../services/people.service';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('EditSceneComponent', () => {
  let component: EditSceneComponent;
  let fixture: ComponentFixture<EditSceneComponent>;
  let sceneService: jasmine.SpyObj<SceneService>;

  const scene: Scene = {
    id: 'scene-1', image: 'url', caption: 'Alt', owner: 'user-1', people: ['p1', 'hidden'],
  };
  const image = new File(['x'], 'bild.png', { type: 'image/png' });

  function fileEvent(file: File): Event {
    return { target: { files: [file] } } as unknown as Event;
  }

  async function setup(props: any) {
    sceneService = jasmine.createSpyObj('SceneService', ['create', 'update']);
    sceneService.create.and.returnValue(Promise.resolve());
    sceneService.update.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      declarations: [EditSceneComponent],
      imports: [FormsModule],
      providers: [
        ...createComponentTestProviders(),
        { provide: SceneService, useValue: sceneService },
        {
          provide: PeopleService,
          useValue: { getPeople: () => of([{ id: 'p2', name: 'Zora' }, { id: 'p1', name: 'Alrik' }]) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditSceneComponent);
    component = fixture.componentInstance;
    component.props = props;
    spyOn(component.dismissPopover, 'emit');
    fixture.detectChanges();
  }

  describe('creating', () => {
    beforeEach(() => setup({ personId: 'p1' }));

    it('preselects the person the popover was opened from', () => {
      expect([...component.selected]).toEqual(['p1']);
    });

    it('lists people sorted by name', () => {
      const labels = Array.from(fixture.nativeElement.querySelectorAll('.people label'))
        .map((label: any) => label.textContent.trim());
      expect(labels).toEqual(['Alrik', 'Zora']);
    });

    it('cannot save without an image', () => {
      expect(component.canSave).toBeFalse();
    });

    it('rejects files that are not images', () => {
      component.fileChanged(fileEvent(new File(['x'], 'notizen.txt', { type: 'text/plain' })));

      expect(component.file).toBeNull();
      expect(component.fileInvalid).toBeTrue();
      expect(component.canSave).toBeFalse();
    });

    it('cannot save without any tagged person', () => {
      component.fileChanged(fileEvent(image));
      component.toggle('p1', false);

      expect(component.canSave).toBeFalse();
    });

    it('creates the scene and closes', async () => {
      component.fileChanged(fileEvent(image));
      component.caption = 'Am Fluss';
      component.toggle('p2', true);

      await component.save();

      expect(sceneService.create).toHaveBeenCalledWith(image, 'Am Fluss', ['p1', 'p2']);
      expect(component.dismissPopover.emit).toHaveBeenCalledWith(true);
    });

    it('stays open and can retry when saving fails', async () => {
      spyOn(console, 'error');
      sceneService.create.and.returnValue(Promise.reject(new Error('upload failed')));
      component.fileChanged(fileEvent(image));

      await component.save();

      expect(component.dismissPopover.emit).not.toHaveBeenCalled();
      expect(component.saving).toBeFalse();
      expect(component.canSave).toBeTrue();
    });
  });

  describe('editing', () => {
    beforeEach(() => setup({ scene }));

    it('starts from the scene caption and tags', () => {
      expect(component.caption).toBe('Alt');
      expect(component.selected.has('p1')).toBeTrue();
    });

    it('shows no file input', () => {
      expect(fixture.nativeElement.querySelector('input[type=file]')).toBeNull();
      expect(component.canSave).toBeTrue();
    });

    it('keeps tags on people the editor cannot see', async () => {
      component.toggle('p2', true);

      await component.save();

      expect(sceneService.update).toHaveBeenCalledWith(scene, 'Alt', ['p1', 'hidden', 'p2']);
    });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/people/components/edit-scene/edit-scene.component.spec.ts'`
Expected: FAIL — `Cannot find module './edit-scene.component'`.

- [ ] **Step 3: Implement the component**

`src/app/people/components/edit-scene/edit-scene.component.ts`:

```ts
import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { PopoverChild } from '../../../shared/models/popover-child';
import type { EditSceneProps, Person } from '../../models';
import { PeopleService } from '../../services/people.service';
import { SceneService } from '../../services/scene.service';
import { UtilService } from '../../../core/services/util.service';



@Component({
  selector: 'app-edit-scene',
  templateUrl: './edit-scene.component.html',
  styleUrls: ['./edit-scene.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class EditSceneComponent implements OnInit, PopoverChild {
  private peopleService = inject(PeopleService);
  private sceneService = inject(SceneService);

  @Input() props: EditSceneProps;
  @Output() dismissPopover = new EventEmitter<boolean>();
  caption = '';
  file: File | null = null;
  fileInvalid = false;
  people$: Observable<Person[]>;
  saving = false;
  /** May hold ids of people the user cannot see; those are kept as they are */
  selected = new Set<string>();

  ngOnInit(): void {
    this.people$ = this.peopleService.getPeople().pipe(
      map(people => [...people].sort(UtilService.orderByName)),
    );

    if (this.props.scene) {
      this.caption = this.props.scene.caption;
      this.props.scene.people.forEach(id => this.selected.add(id));
    } else if (this.props.personId) {
      this.selected.add(this.props.personId);
    }
  }



  get canSave(): boolean {
    return !this.saving
      && this.selected.size > 0
      && (!!this.props.scene || !!this.file);
  }


  fileChanged(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.fileInvalid = !!file && !file.type.startsWith('image/');
    this.file = file && !this.fileInvalid ? file : null;
  }


  toggle(personId: string, checked: boolean) {
    if (checked) {
      this.selected.add(personId);
    } else {
      this.selected.delete(personId);
    }
  }


  async save() {
    if (!this.canSave) {
      return;
    }

    this.saving = true;
    try {
      if (this.props.scene) {
        await this.sceneService.update(this.props.scene, this.caption, [...this.selected]);
      } else {
        await this.sceneService.create(this.file, this.caption, [...this.selected]);
      }
      this.dismissPopover.emit(true);
    } catch (error) {
      console.error('Saving scene failed', error);
      this.saving = false;
    }
  }
}
```

`src/app/people/components/edit-scene/edit-scene.component.html`:

```html
<form (ngSubmit)="save()">
  @if (!props.scene) {
    <div class="form-group">
      <label for="sceneImage">Bild</label>
      <input type="file" id="sceneImage" accept="image/*" (change)="fileChanged($event)">
    </div>
    @if (fileInvalid) {
      <p class="hint">Bitte eine Bilddatei auswählen.</p>
    }
  }

  <div class="form-group">
    <label for="sceneCaption">Beschreibung</label>
    <input type="text" class="form-control" id="sceneCaption" name="caption" [(ngModel)]="caption">
  </div>

  <div class="people">
    @for (person of people$ | async; track person.id) {
      <div class="form-group">
        <input
          type="checkbox"
          id="scene-person-{{person.id}}"
          [checked]="selected.has(person.id)"
          (change)="toggle(person.id, $any($event.target).checked)"
        />
        <label for="scene-person-{{person.id}}">{{person.name}}</label>
      </div>
    }
  </div>

  <button type="submit" class="btn" [disabled]="!canSave">
    Speichern
  </button>
</form>
```

`src/app/people/components/edit-scene/edit-scene.component.scss`:

```scss
.people {
  max-height: 40vh;
  margin-bottom: var(--item-padding);
  overflow-y: auto;
}

.hint {
  margin-top: 0;
}
```

In `src/app/people/people.module.ts` add the import and the declaration (alphabetical, after `EditCapabilityComponent`):

```ts
import { EditSceneComponent } from './components/edit-scene/edit-scene.component';
```

```ts
    EditSceneComponent,
```

- [ ] **Step 4: Run the spec**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/people/components/edit-scene/edit-scene.component.spec.ts'`
Expected: all EditSceneComponent specs PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/people/components/edit-scene src/app/people/people.module.ts
git commit -m "Add popover to create and edit scenes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: ScenesComponent (thumbnail grid with manage actions)

**Files:**
- Create: `src/app/people/components/scenes/scenes.component.ts`
- Create: `src/app/people/components/scenes/scenes.component.html`
- Create: `src/app/people/components/scenes/scenes.component.scss`
- Test: `src/app/people/components/scenes/scenes.component.spec.ts`
- Modify: `src/app/people/people.module.ts` (declare `ScenesComponent`)

**Interfaces:**
- Consumes: `Scene`, `EditSceneProps`, `EditSceneComponent` (Task 5), `SceneService.collection`, `SceneService.delete(scene)`, `EditAccessComponent` + `EditAccessProps { collection, documentId, ownerId }`, `PopoverService.showPopover<T>(title, component, props)`, `AuthService.user` (`{ id, isGM }`).
- Produces: `ScenesComponent` (`selector: 'app-scenes'`, `@Input() scenes: Scene[]`), public `canManage(scene)`, `edit(scene)`, `editAccess(scene)`, `remove(scene): Promise<void>`.

- [ ] **Step 1: Write the failing spec**

`src/app/people/components/scenes/scenes.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import type { Scene } from '../../models';
import { ScenesComponent } from './scenes.component';
import { SceneService } from '../../services/scene.service';
import { AuthService } from '../../../core/services/auth.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditSceneComponent } from '../edit-scene/edit-scene.component';
import { EditAccessComponent } from '../../../shared/components/edit-access/edit-access.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('ScenesComponent', () => {
  let component: ScenesComponent;
  let fixture: ComponentFixture<ScenesComponent>;
  let auth: any;
  let popover: any;
  let sceneService: jasmine.SpyObj<SceneService>;

  const own: Scene = { id: 's1', image: 'https://example.com/1.jpg', caption: 'Eigene', owner: 'user-1', people: ['p1'] };
  const shared: Scene = { id: 's2', image: 'https://example.com/2.jpg', caption: '', owner: 'user-2', people: ['p1'] };

  beforeEach(async () => {
    sceneService = jasmine.createSpyObj('SceneService', ['delete']);
    sceneService.delete.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      declarations: [ScenesComponent],
      providers: [
        ...createComponentTestProviders(),
        { provide: SceneService, useValue: sceneService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    popover = TestBed.inject(PopoverService);
    fixture = TestBed.createComponent(ScenesComponent);
    component = fixture.componentInstance;
    component.scenes = [own, shared];
    fixture.detectChanges();
  });

  it('renders one linked thumbnail per scene', () => {
    const links = fixture.nativeElement.querySelectorAll('.scene a');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe(own.image);
    expect(fixture.nativeElement.textContent).toContain('Eigene');
  });

  it('shows actions only on scenes the user owns', () => {
    const scenes = fixture.nativeElement.querySelectorAll('.scene');
    expect(scenes[0].querySelector('.actions')).not.toBeNull();
    expect(scenes[1].querySelector('.actions')).toBeNull();
  });

  it('shows actions on every scene for a GM', () => {
    auth.user.isGM = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.scene .actions').length).toBe(2);
  });

  it('opens the edit popover with the scene', () => {
    component.edit(own);

    expect(popover.showPopover).toHaveBeenCalledWith('Szene bearbeiten', EditSceneComponent, { scene: own });
  });

  it('opens access management for the scene', () => {
    component.editAccess(own);

    expect(popover.showPopover).toHaveBeenCalledWith('Zugriff regeln', EditAccessComponent, {
      collection: 'scenes',
      documentId: 's1',
      ownerId: 'user-1',
    });
  });

  it('deletes only after confirmation', async () => {
    spyOn(window, 'confirm').and.returnValues(false, true);

    await component.remove(own);
    expect(sceneService.delete).not.toHaveBeenCalled();

    await component.remove(own);
    expect(sceneService.delete).toHaveBeenCalledWith(own);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/people/components/scenes/scenes.component.spec.ts'`
Expected: FAIL — `Cannot find module './scenes.component'`.

- [ ] **Step 3: Implement the component**

`src/app/people/components/scenes/scenes.component.ts`:

```ts
import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { faPen, faTrash, faUserLock } from '@fortawesome/free-solid-svg-icons';

import type { EditSceneProps, Scene } from '../../models';
import type { EditAccessProps } from '../../../shared';
import { AuthService } from '../../../core/services/auth.service';
import { PopoverService } from '../../../core/services/popover.service';
import { SceneService } from '../../services/scene.service';
import { EditSceneComponent } from '../edit-scene/edit-scene.component';
import { EditAccessComponent } from '../../../shared/components/edit-access/edit-access.component';



@Component({
  selector: 'app-scenes',
  templateUrl: './scenes.component.html',
  styleUrls: ['./scenes.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class ScenesComponent {
  private auth = inject(AuthService);
  private popover = inject(PopoverService);
  private sceneService = inject(SceneService);

  @Input() scenes: Scene[] = [];
  faPen = faPen;
  faTrash = faTrash;
  faUserLock = faUserLock;



  canManage(scene: Scene): boolean {
    const user = this.auth.user;
    return !!user && (user.isGM || user.id === scene.owner);
  }


  edit(scene: Scene) {
    this.popover.showPopover<EditSceneProps>('Szene bearbeiten', EditSceneComponent, { scene });
  }


  editAccess(scene: Scene) {
    this.popover.showPopover<EditAccessProps>('Zugriff regeln', EditAccessComponent, {
      collection: SceneService.collection,
      documentId: scene.id,
      ownerId: scene.owner,
    });
  }


  async remove(scene: Scene) {
    if (!confirm('Diese Szene löschen?')) {
      return;
    }
    try {
      await this.sceneService.delete(scene);
    } catch (error) {
      console.error('Deleting scene failed', error);
    }
  }
}
```

`src/app/people/components/scenes/scenes.component.html`:

```html
<div class="scenes">
  @for (scene of scenes; track scene.id) {
    <figure class="scene">
      <a [href]="scene.image" target="_blank" rel="noopener">
        <img [src]="scene.image" [alt]="scene.caption || 'Szene'" loading="lazy">
      </a>
      @if (scene.caption) {
        <figcaption>{{scene.caption}}</figcaption>
      }
      @if (canManage(scene)) {
        <div class="actions">
          <button type="button" class="btn-icon" title="Bearbeiten" (click)="edit(scene)">
            <fa-icon [icon]="faPen" [fixedWidth]="true"></fa-icon>
          </button>
          <button type="button" class="btn-icon" title="Zugriff regeln" (click)="editAccess(scene)">
            <fa-icon [icon]="faUserLock" [fixedWidth]="true"></fa-icon>
          </button>
          <button type="button" class="btn-icon" title="Löschen" (click)="remove(scene)">
            <fa-icon [icon]="faTrash" [fixedWidth]="true"></fa-icon>
          </button>
        </div>
      }
    </figure>
  }
</div>
```

`src/app/people/components/scenes/scenes.component.scss`:

```scss
.scenes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--item-padding);
}

.scene {
  margin: 0;

  img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }

  figcaption {
    padding-top: calc(var(--item-padding) / 2);
  }
}

.actions {
  display: flex;
  justify-content: flex-end;
}
```

In `src/app/people/people.module.ts` add the import and declaration (alphabetical, after `PersonSummaryComponent`):

```ts
import { ScenesComponent } from './components/scenes/scenes.component';
```

```ts
    ScenesComponent,
```

- [ ] **Step 4: Run the spec**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/people/components/scenes/scenes.component.spec.ts'`
Expected: all ScenesComponent specs PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/people/components/scenes src/app/people/people.module.ts
git commit -m "Add scene thumbnail grid with manage actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Wire scenes into the person page

**Files:**
- Modify: `src/app/people/components/person/person.component.ts`
- Modify: `src/app/people/components/person/person.component.html`
- Test: `src/app/people/components/person/person.component.spec.ts`

**Interfaces:**
- Consumes: `SceneService.getScenesForPerson(personId)`, `ScenesComponent` (`app-scenes`, `[scenes]`), `EditSceneComponent`, `EditSceneProps`, `TabsComponent` fallback (Task 4).
- Produces: `PersonComponent.scenes$: Observable<Scene[]>`; menu entry *Szene hinzufügen* (not restricted).

- [ ] **Step 1: Write the failing spec**

Replace `src/app/people/components/person/person.component.spec.ts` with:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { PersonComponent } from './person.component';
import { PeopleService } from '../../services/people.service';
import { SceneService } from '../../services/scene.service';
import { PopoverService } from '../../../core/services/popover.service';
import { EditSceneComponent } from '../edit-scene/edit-scene.component';
import { createComponentTestProviders } from '../../../testing/supabase-test-helpers';

describe('PersonComponent', () => {
  let component: PersonComponent;
  let fixture: ComponentFixture<PersonComponent>;
  let sceneService: jasmine.SpyObj<SceneService>;

  const person = {
    id: 'p1', name: 'Alrik Sohn', owner: 'user-2', relatives: {}, tags: [], attributes: [],
  };

  beforeEach(async () => {
    sceneService = jasmine.createSpyObj('SceneService', ['getScenesForPerson']);
    sceneService.getScenesForPerson.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [PersonComponent],
      providers: [
        ...createComponentTestProviders(),
        { provide: PeopleService, useValue: { getPersonById: () => of(person), getPeople: () => of([person]) } },
        { provide: SceneService, useValue: sceneService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonComponent);
    component = fixture.componentInstance;
    component.entityId = 'p1';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the scenes of the person', () => {
    expect(sceneService.getScenesForPerson).toHaveBeenCalledWith('p1');
  });

  it('hides the Szenen tab when there are no scenes', () => {
    expect(fixture.nativeElement.querySelector('app-tab-panel#scenes')).toBeNull();
  });

  it('shows the Szenen tab when there are scenes', async () => {
    sceneService.getScenesForPerson.and.returnValue(of([
      { id: 's1', image: 'url', caption: '', owner: 'user-1', people: ['p1'] },
    ]));
    component.ngOnDestroy();
    component.ngOnInit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-tab-panel#scenes')).not.toBeNull();
  });

  it('offers "Szene hinzufügen" to users who do not own the person', () => {
    const entry = component.menu.actions.find(action => action.label === 'Szene hinzufügen');
    expect(entry).toBeDefined();
    expect(entry.restricted).toBeFalsy();

    entry.action();

    expect(TestBed.inject(PopoverService).showPopover).toHaveBeenCalledWith(
      'Szene hinzufügen', EditSceneComponent, { personId: 'p1' },
    );
  });
});
```

If `Person`'s required fields make the `person` literal fail to compile, cast it: `const person = { … } as any;`.

- [ ] **Step 2: Run it to see it fail**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/people/components/person/person.component.spec.ts'`
Expected: FAIL — `getScenesForPerson` not called, no `Szene hinzufügen` entry.

- [ ] **Step 3: Wire it up**

In `src/app/people/components/person/person.component.ts`:

Add imports:

```ts
import type { EditSceneProps, Person, Scene } from '../../models';
import { SceneService } from '../../services/scene.service';
import { EditSceneComponent } from '../edit-scene/edit-scene.component';
```
(replace the existing `import type { Person } from '../../models';`)

Add the injection next to the other services (alphabetical):

```ts
  private sceneService = inject(SceneService);
```

Add the field after `relativeTypes`:

```ts
  scenes$: Observable<Scene[]>;
```

Add the menu entry directly before the `'Neue Info'` entry:

```ts
      {
        label: 'Szene hinzufügen',
        action: this.addScene.bind(this),
      },
```

In the `ngOnInit` subscribe callback, after `this.infos$ = …`:

```ts
        this.scenes$ = this.sceneService.getScenesForPerson(this.person.id);
```

Add the private method after `addDetail()`:

```ts
  private addScene() {
    this.popover.showPopover<EditSceneProps>('Szene hinzufügen', EditSceneComponent, {
      personId: this.person.id,
    });
  }
```

In `src/app/people/components/person/person.component.html`, add after the `@if (isOwnerOrCan('viewStats')) { … }` block, still inside `<app-tabs>`:

```html
      @if (scenes$ | async; as scenes) {
        @if (scenes.length > 0) {
          <app-tab-panel id="scenes" label="Szenen">
            <app-scenes [scenes]="scenes"></app-scenes>
          </app-tab-panel>
        }
      }
```

- [ ] **Step 4: Run the spec, then everything**

Run: `ng test --watch=false --browsers=ChromeHeadless --include='**/people/components/person/person.component.spec.ts'` → all PASS
Run: `npx tsc --noEmit -p tsconfig.app.json` → no output
Run: `ng test --watch=false --browsers=ChromeHeadless` → whole suite green (was 332 before this branch; expect ~360). Fix any failure before continuing — a suite failing in `beforeEach` with zero passing means a missing `SceneService` provider somewhere.

- [ ] **Step 5: Commit**

```bash
git add src/app/people/components/person
git commit -m "Show scenes on the person page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Manual check in the running app**

With the local Supabase stack up, run `ng serve` and use two browser profiles: a non-GM player (A) and a second non-GM player (B), both able to see the same person.

1. A opens the person → menu → *Szene hinzufügen* → picks an image with a name like `Mein Bild (1).JPG`, adds a caption, saves. The Szenen tab appears with the thumbnail; clicking it opens the full image.
2. B opens the same person: no Szenen tab.
3. A → scene → *Zugriff regeln* → ticks B → Speichern. B's page shows the Szenen tab without a reload, with no action buttons.
4. A untags the person via *Bearbeiten*. Both pages lose the scene; if B had the Szenen tab open, B lands on the first tab.
5. A re-tags and deletes the scene: it disappears; in Studio (`http://127.0.0.1:55433`) neither the `scenes` row nor the file under `scenes/<id>/` remains.
6. Pick a `.txt` file in the popover: the hint shows and Speichern stays disabled.

Record anything that deviates; fix it before finishing the branch.
