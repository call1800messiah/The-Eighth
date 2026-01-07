# Flow Feature - TODOs

**Status**: Phase 1 - Discussion
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
- [ ] Create data models
- [ ] Create FlowService
- [ ] Create flow components
- [ ] Add routing
- [ ] Implement drag and drop
- [ ] Add to navigation menu
- [ ] Write tests
- [ ] Verify build/lint/test

## Known Issues
None yet.

## Ideas
- Future: Allow collapsing sessions to see high-level overview
- Future: Export flow as session prep document
- Future: Timeline view showing past sessions
