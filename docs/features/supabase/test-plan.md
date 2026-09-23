# Supabase Migration - Test Plan

## Test Strategy

This migration requires three types of validation:
1. **Pre-migration validation** - Ensure Firebase data is clean before export
2. **Post-migration validation** - Verify data integrity in PostgreSQL
3. **Functional validation** - Ensure Angular app works correctly with Supabase

## Pre-Migration Validation (T-PRE)

### T-PRE-001: Orphaned Location References
**Description**: People with location_id pointing to deleted places
**Query**:
```javascript
// Firebase: Check each person.location exists in places collection
```
**Expected**: 0 orphaned references
**Action if fails**: Fix or clear invalid location_id in Firebase

### T-PRE-002: Orphaned Place Parent References
**Description**: Places with parent_id pointing to deleted places
**Query**: Check places.parent_id exists
**Expected**: 0 orphaned references
**Action if fails**: Fix or clear invalid parent_id

### T-PRE-003: Orphaned Quest Parent References
**Description**: Quests with parent_id pointing to deleted quests
**Query**: Check quests.parent_id exists
**Expected**: 0 orphaned references
**Action if fails**: Fix or clear invalid parent_id

### T-PRE-004: Circular Place Hierarchies
**Description**: Places that form circular parent chains
**Query**: Traverse parent_id chains, detect cycles
**Expected**: 0 circular references
**Action if fails**: Break cycle by clearing one parent_id

### T-PRE-005: Circular Quest Hierarchies
**Description**: Quests that form circular parent chains
**Query**: Traverse parent_id chains, detect cycles
**Expected**: 0 circular references
**Action if fails**: Break cycle by clearing one parent_id

### T-PRE-006: Invalid Access Arrays
**Description**: Access arrays containing deleted user IDs
**Query**: Check all access array entries exist in users
**Expected**: All user IDs valid
**Action if fails**: Remove invalid IDs from access arrays

### T-PRE-007: Orphaned Flow Items
**Description**: Flow items referencing deleted entities
**Query**: Check flow item references (person/place/quest/note) exist
**Expected**: 0 orphaned references
**Action if fails**: Remove orphaned flow items

### T-PRE-008: Orphaned Combatants
**Description**: Combatants with person_id pointing to deleted people
**Query**: Check combatant.person exists in people
**Expected**: 0 orphaned references
**Action if fails**: Remove orphaned combatants or convert to enemy type

## Post-Migration Validation (T-POST)

### T-POST-001: Row Count Validation
**Description**: Verify row counts match between Firebase and PostgreSQL
**Query**:
```sql
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL SELECT 'people', COUNT(*) FROM people
-- ... all tables
```
**Expected**: Counts match Firebase export JSON line counts

### T-POST-002: Foreign Key Integrity - People Location
**Query**:
```sql
SELECT id, name, location_id FROM people
WHERE location_id IS NOT NULL
AND location_id NOT IN (SELECT id FROM places);
```
**Expected**: 0 rows

### T-POST-003: Foreign Key Integrity - Places Parent
**Query**:
```sql
SELECT id, name, parent_id FROM places
WHERE parent_id IS NOT NULL
AND parent_id NOT IN (SELECT id FROM places);
```
**Expected**: 0 rows

### T-POST-004: Foreign Key Integrity - Quests Parent
**Query**:
```sql
SELECT id, name, parent_id FROM quests
WHERE parent_id IS NOT NULL
AND parent_id NOT IN (SELECT id FROM quests);
```
**Expected**: 0 rows

### T-POST-005: Junction Table Integrity - Person Advantages
**Query**:
```sql
SELECT pa.* FROM person_advantages pa
LEFT JOIN people p ON pa.person_id = p.id
LEFT JOIN rules r ON pa.rule_id = r.id
WHERE p.id IS NULL OR r.id IS NULL;
```
**Expected**: 0 rows

### T-POST-006: Junction Table Integrity - Person Skills
**Query**: Same pattern as T-POST-005 for person_skills
**Expected**: 0 rows

### T-POST-007: Document Access - No Owners
**Description**: document_access should not contain entity owners
**Query**:
```sql
SELECT da.* FROM document_access da
JOIN people p ON da.entity_type = 'person' AND da.entity_id = p.id
WHERE da.user_id = p.owner_id;
```
**Expected**: 0 rows

### T-POST-008: Document Access - No GMs
**Description**: document_access should not contain GM users
**Query**:
```sql
SELECT da.* FROM document_access da
JOIN user_roles ur ON da.user_id = ur.user_id
WHERE ur.role = 'gm';
```
**Expected**: 0 rows

### T-POST-009: Hierarchical Depth - Places
**Description**: No suspiciously deep hierarchies
**Query**: Recursive CTE to calculate depth
**Expected**: Max depth < 10

### T-POST-010: Hierarchical Depth - Quests
**Description**: No suspiciously deep hierarchies
**Query**: Recursive CTE to calculate depth
**Expected**: Max depth < 10

### T-POST-011: Person Relationships Bidirectional
**Description**: Parent-child relationships should have inverse entries
**Query**: Check for missing inverse relationships
**Expected**: All relationships properly mirrored

### T-POST-012: Storage Files Migrated
**Description**: All Firebase Storage files exist in Supabase Storage
**Query**: Compare file lists
**Expected**: File counts match

### T-POST-013: Audio Files Present
**Description**: Audio folder has expected files
**Query**: List Supabase Storage audio/ folder
**Expected**: Audio files accessible

## Functional Validation (T-FUNC)

### T-FUNC-001: Login Flow
**Steps**:
1. Navigate to login page
2. Enter valid credentials
3. Submit login form
**Expected**: User logged in, redirected to overview

### T-FUNC-002: isGM Property
**Steps**:
1. Login as GM user
2. Check user object in AuthService
**Expected**: `user.isGM === true`

### T-FUNC-003: isGM UI Elements
**Steps**:
1. Login as GM user
2. Navigate to achievements list
3. Check for "Add" button visibility
**Expected**: Add button visible for GM

### T-FUNC-004: Non-GM Access
**Steps**:
1. Login as regular player
2. Navigate to achievements list
3. Check for "Add" button visibility
**Expected**: Add button NOT visible for player

### T-FUNC-005: RLS - Owner Access
**Steps**:
1. Login as user who owns a person
2. Fetch people list
**Expected**: Own person visible in list

### T-FUNC-006: RLS - GM Access
**Steps**:
1. Login as GM
2. Fetch people list
**Expected**: ALL people visible

### T-FUNC-007: RLS - Explicit Access
**Steps**:
1. Login as user with explicit grant to a person (not owner, not GM)
2. Fetch people list
**Expected**: Granted person visible in list

### T-FUNC-008: RLS - No Access
**Steps**:
1. Login as user with no access to a specific person
2. Fetch people list
**Expected**: That person NOT visible

### T-FUNC-009: Real-time Updates
**Steps**:
1. Open app in two browser windows (same user)
2. Edit a person in window 1
3. Check window 2
**Expected**: Window 2 updates automatically

### T-FUNC-010: People CRUD - Create
**Steps**:
1. Login as GM
2. Create new person
3. Verify person appears in list
**Expected**: Person created with correct owner_id

### T-FUNC-011: People CRUD - Update
**Steps**:
1. Login as owner of a person
2. Edit person details
3. Save changes
**Expected**: Changes persisted

### T-FUNC-012: People CRUD - Delete
**Steps**:
1. Login as owner or GM
2. Delete a person
**Expected**: Person removed, junction data cascaded

### T-FUNC-013: Person Junction Data
**Steps**:
1. View person with advantages/skills/etc.
2. Check all junction data displays correctly
**Expected**: All advantages, skills, spells, etc. visible

### T-FUNC-014: Place Hierarchy
**Steps**:
1. View place with parent/children
2. Navigate hierarchy
**Expected**: Parent breadcrumb, children list correct

### T-FUNC-015: Quest Hierarchy
**Steps**:
1. View quest with parent/sub-quests
2. Navigate hierarchy
**Expected**: Parent breadcrumb, sub-quests correct

### T-FUNC-016: Flow Items
**Steps**:
1. View flow with items
2. Check referenced entities load
**Expected**: Person/place/quest/note items display correctly

### T-FUNC-017: Combat Session
**Steps**:
1. Open combat view
2. Check combatants load
**Expected**: Combatants display with attributes

### T-FUNC-018: File Upload
**Steps**:
1. Edit a person
2. Upload new avatar image
**Expected**: Image uploads to Supabase Storage, path saved

### T-FUNC-019: File Display
**Steps**:
1. View person with avatar
**Expected**: Image displays from Supabase Storage URL

### T-FUNC-020: Audio Player
**Steps**:
1. Open audio player component
2. Check audio files list
**Expected**: Audio files listed from Supabase Storage bucket

### T-FUNC-021: Rules Loading
**Steps**:
1. View person with skills/advantages
2. Check rule names resolve
**Expected**: Rule references show names from database

### T-FUNC-022: Timeline Events
**Steps**:
1. View timeline with events
2. Load more events (pagination)
**Expected**: Events paginate correctly

## Coverage Targets

| Area | Target | Notes |
|------|--------|-------|
| Pre-migration checks | 100% | Must pass before export |
| Post-migration checks | 100% | Must pass before service refactor |
| RLS policies | All 4 roles | observer, player, co_gm, gm |
| CRUD operations | All entities | Create, Read, Update, Delete |
| Real-time | Basic test | Single update propagation |
| Storage | Upload + Display | One file type sufficient |

## Test Execution Order

1. Run T-PRE-* before export
2. Run T-POST-* after data migration
3. Run T-FUNC-* after service refactoring
4. Re-run T-FUNC-* after Firebase removal
