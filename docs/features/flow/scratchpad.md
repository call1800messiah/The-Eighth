# Flow Feature - Scratchpad

## Implementation Complete: Dynamic Detail Views

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
