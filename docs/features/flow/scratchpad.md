# Flow Feature - Scratchpad

## Latest Change: Multiple Session Flows per Campaign

### Architecture Change (January 2026)
Converted from single flow with session markers to multiple independent session flows:
- Each flow now represents one game session
- Flow model includes `date: Date` and optional `title?: string`
- Session markers removed entirely
- List/detail routing pattern implemented

### Data Model Changes
- **Flow**: Added `date` and `title?` fields
- **FlowDB**: Added `date: Timestamp` and `title?: string` for Firestore
- **Removed**: SessionMarkerFlowItem, SessionMarkerFlowItemDB
- **FlowItemType enum**: Removed SessionMarker, now only: Quest, Person, Place, Note

### Service Layer Updates
- **FlowService**: Complete refactor
  - Changed from `flow$: BehaviorSubject<Flow | null>` to `flows$: BehaviorSubject<Flow[]>`
  - New methods: `getFlows()`, `getFlowById(id)`, `updateFlow(id, updates)`
  - Updated methods now accept flowId parameter: `addItem(flowId, ...)`, `addItems(flowId, ...)`, `removeItem(flowId, ...)`, `reorderItems(flowId, ...)`
  - Removed: `updateSessionMarker()`
  - Query removed `.limit(1)` - now fetches all flows
  - Flows sorted newest first by date

### New Components
- **FlowListComponent**: List view showing all session flows
  - Displays date, optional title, item count
  - Filter by date or title (localStorage persistence)
  - Create new session button
  - Click to navigate to detail view
- **EditFlowComponent**: Create/edit flow metadata
  - Date picker (required)
  - Title input (optional)
  - Used in list (create) and detail view (edit)

### Updated Components
- **FlowViewComponent**:
  - Now loads specific flow by route param `:id`
  - Displays flow date/title in page label
  - Passes flowId to all operations
  - Added edit button, removed session marker button
- **AddFlowItemComponent**:
  - Now accepts `props: { flowId: string }`
  - Passes flowId to service methods
- **SessionMarkerComponent**: Deleted entirely

### Routing Changes
- `/flow` → FlowListComponent (list of all sessions)
- `/flow/:id` → FlowViewComponent (specific session detail)
- Follows standard dashboard pattern like quests/people/places

### Build Status
- ✓ Build successful (ng build)
- Flow module size: 650.91 kB (up from 636.89 kB - expected increase with new components)
- No TypeScript errors
- Only existing warnings (slugify, g-sheets-api dependencies)

### Migration Considerations
- **Current Firestore data**: Existing flows have session markers as items
- **Migration needed**: Split existing flows by session markers into separate flow documents
- **Migration script**: Out of scope for this implementation - needs separate admin tool
- **Data preservation**: Each new flow should maintain original access/campaignId/createdBy

## Previous Implementation: Dynamic Detail Views

### Detail Components Refactored
All detail components now support both routed and embedded usage:
- **QuestComponent**: Accepts `@Input() entityId` for embedded use
- **PersonComponent**: Accepts `@Input() entityId` for embedded use
- **PlaceComponent**: Accepts `@Input() entityId` for embedded use
- **NoteComponent**: Created with `@Input() entityId` for embedded use

### FlowItemComponent
- Uses `ViewContainerRef` to dynamically load detail components
- On expand: Creates appropriate component (Quest/Person/Place/Note)
- On collapse: Destroys component via `componentRef.destroy()`
- Memory-safe: Subscription cleanup handled by component's ngOnDestroy

### Notes Integration Complete
- Replaced GeneralNoteFlowItem with NoteFlowItem (references existing notes)
- Created NoteComponent for inline display
- Added notes tab to AddFlowItemComponent
- FlowService enriches notes via combineLatest with NotesService
- GeneralNoteComponent removed (no longer needed)

### Auto-add Notes on Creation
- EditNoteComponent now supports optional `onSave` callback via props
- FlowViewComponent's `showAddNoteModal()` passes callback to auto-add note to flow
- When user creates a note via the sticky note button, it's automatically added to the flow
- Callback receives the newly created Note with its generated ID from Firebase

### DataService.store() Refactoring
- Updated return type from `Promise<boolean>` to `Promise<{ success: boolean; id?: string }>`
- Ensures newly created documents return their Firebase-generated ID
- Maintains proper access rights initialization by letting Firebase generate IDs
- Updated all service wrappers: NotesService, FlowService, ProjectService, RulesService
- All FlowService methods now extract `.success` from store result
- Build verified successfully - no breaking changes to existing code

## Verification Pending
- Build check (ng build) ✓ PASSED
- Lint check (ng lint)
- All tests passing (ng test)
- Manual testing of expand/collapse functionality
- Manual testing of notes tab in add modal
- Memory leak verification (Chrome DevTools)
- Code style review
- Quality standards verification

## Cross-References to Add
After verification passes, update these feature docs:
- **quests/description.md**: Add flow under "Related Features"
- **people/description.md**: Add flow under "Related Features"
- **places/description.md**: Add flow under "Related Features"
