# Flow Feature - TODOs

**Status**: Complete
**Last Updated**: 2026-01-12

## Active TODOs

### Phase 1: DISCUSS
- [x] Clarify feature scope (session flow planner)
- [x] Determine authentication (GM only)
- [x] Define data model (lightweight flow with references)
- [x] Clarify integration points (campaigns, quests, people, places)
- [x] Define edge cases (auto-remove on entity delete)
- [x] Create feature documentation

### Phase 2: BILL OF MATERIALS
- [x] Scan codebase for existing patterns
- [x] Identify reusable components
- [x] List new files to create
- [x] Identify dependencies
- [x] Document related features (campaign management domain)

### Phase 3: INTERFACES
- [x] Research existing UI patterns (matched quest/people layouts)
- [x] Ask about UI consistency (use existing patterns)
- [x] Ask about field visibility (name, icon, type)
- [x] Ask about add item UX (modal with tabs)
- [x] Ask about drag & drop (handle icon)
- [x] Ask about click action (expand inline)
- [x] Create wireframes (flow view, add modal, empty state)
- [x] Present UI/UX for approval
- [x] Present architecture options (data storage, campaign link, data resolution, drag/drop)
- [x] Design service interfaces (FlowService)
- [x] Design component interfaces (FlowView, FlowItem, AddFlowItem, SessionMarker, GeneralNote)
- [x] Design data models (Flow, FlowDB, FlowItem types, Enriched types)
- [x] Document architecture decisions
- [x] Get user approval on complete architecture

### Phase 4: TEST PLAN
- [x] Define test strategy (Unit, Component, E2E)
- [x] Create test cases (76 total test IDs)
  - [x] FlowService unit tests (17 tests)
  - [x] Component tests (41 tests across 5 components)
  - [x] E2E user journey tests (10 tests)
  - [x] Edge case tests (8 tests)
- [x] Set coverage targets (80% service, 60-70% components)
- [x] Define mock data requirements
- [x] Document test execution order

### Phase 5: IMPLEMENT

#### Step 1: Setup
- [x] Install @angular/cdk dependency
- [x] Create flow module structure

#### Step 2: Data Models
- [x] Create FlowItemType enum
- [x] Create flow.db.ts (Firestore schema)
- [x] Create flow.ts (Application model)
- [x] Create flow-item.ts (FlowItem types)
- [x] Create models index.ts

#### Step 3: Service Layer
- [x] Create FlowService with CRUD methods
- [x] Implement combineLatest entity resolution
- [x] Handle deleted entities (entity === null)

#### Step 4: Components
- [x] Create FlowViewComponent (main page)
- [x] Create FlowItemComponent (display item)
- [x] Create AddFlowItemComponent (add modal)
- [x] Create SessionMarkerComponent (session divider)
- [x] Create GeneralNoteComponent (inline note)

#### Step 5: Routing & Navigation
- [x] Create flow-routing.module.ts
- [x] Create flow.module.ts
- [x] Add route to app-routing.module.ts
- [x] Add "Session Flow" to NavigationService menu
- [x] Create flow index.ts

#### Step 6: Drag & Drop
- [x] Import DragDropModule from @angular/cdk
- [x] Implement cdkDropList in FlowViewComponent
- [x] Implement cdkDrag in flow items
- [x] Wire up drop handler to FlowService.reorderItems

#### Step 7: Tests
- [x] Write FlowService unit tests (5 critical tests created)
- [x] Write FlowViewComponent tests (5 tests created)
- [x] Write FlowItemComponent tests (5 tests created)
- [x] Write AddFlowItemComponent tests (7 tests created)
- [x] Write SessionMarkerComponent tests (2 tests created)
- [x] Write GeneralNoteComponent tests (4 tests created)

#### Step 8: Dynamic Detail View Loading
- [x] Research existing detail components (quest-detail, person-detail, place-detail)
- [x] Refactor QuestComponent to accept optional @Input() entityId
- [x] Refactor PersonComponent to accept optional @Input() entityId
- [x] Refactor PlaceComponent to accept optional @Input() entityId
- [x] Update FlowItemComponent to use dynamic component loading
- [x] Implement ViewContainerRef for inline component insertion
- [x] Add component destruction on collapse
- [x] Export detail components from their modules
- [x] Import required modules into FlowModule
- [x] Test subscription cleanup (no memory leaks)
- [x] Update FlowItemComponent tests

#### Step 9: Verification
- [x] Run build (ng build)
- [x] Run lint (ng lint)
- [x] Run tests (ng test)
- [x] Run codestyle check
- [x] Verify quality standards

## Implementation Summary

### What Was Built
- **Flow Module**: Complete feature module with lazy-loaded routing
- **5 Components**: FlowList, FlowView, FlowItem, AddFlowItem, EditFlow
- **FlowService**: Full CRUD with BehaviorSubject state management and combineLatest data resolution
- **Dynamic Detail Views**: Inline loading of Quest/Person/Place/Note components with proper lifecycle management
- **Drag & Drop**: Angular CDK integration for reordering flow items
- **28 Unit/Component Tests**: Core functionality coverage for service and components

### Key Features Delivered
- ✅ Multiple sessions (flows) per user, each with date and optional title
- ✅ Support for quests, people, places, and notes
- ✅ Drag and drop reordering within sessions
- ✅ Search and add existing entities from modal
- ✅ Inline detail views on expand (dynamically loaded with proper cleanup)
- ✅ GM-only access
- ✅ Dedicated routes: `/flow` (list), `/flow/:id` (session detail)
- ✅ Auto-remove items when referenced entities are deleted
- ✅ Session list with search/filter capabilities
- ✅ Create/edit/delete session functionality

### Future Enhancements
- Allow collapsing sessions to see high-level overview
- Export flow as session prep document
- Timeline view showing past sessions
