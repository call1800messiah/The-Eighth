# Flow Feature - TODOs

**Status**: Phase 5 - Implementation
**Last Updated**: 2026-01-07

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

#### Step 8: Verification
- [ ] Run build (ng build)
- [ ] Run lint (ng lint)
- [ ] Run tests (ng test)
- [ ] Run codestyle check
- [ ] Verify quality standards

## Known Issues
None yet.

## Ideas
- Future: Allow collapsing sessions to see high-level overview
- Future: Export flow as session prep document
- Future: Timeline view showing past sessions
