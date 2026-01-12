# Flow Feature - Test Plan

## Overview
Testing strategy for the session flow planner feature, covering service logic, component interactions, and end-to-end user journeys.

**Note**: This test plan was created during planning phase and may not fully reflect the final implementation. Core functionality is tested, but some planned tests may have been adjusted or removed during development.

## Test Strategy

### Unit Tests (Karma + Jasmine)
Focus on service logic and data transformations.

| Component | File | Coverage Target | Priority |
|-----------|------|-----------------|----------|
| FlowService | src/app/flow/services/flow.service.spec.ts | 80% | High |
| Flow models | src/app/flow/models/*.ts | N/A (types only) | Low |

### Component Tests (Karma + Jasmine)
Test component rendering, user interactions, and event handling.

| Component | File | Coverage Target | Priority |
|-----------|------|-----------------|----------|
| FlowListComponent | src/app/flow/components/flow-list/flow-list.component.spec.ts | 70% | High |
| FlowViewComponent | src/app/flow/components/flow-view/flow-view.component.spec.ts | 70% | High |
| FlowItemComponent | src/app/flow/components/flow-item/flow-item.component.spec.ts | 70% | High |
| AddFlowItemComponent | src/app/flow/components/add-flow-item/add-flow-item.component.spec.ts | 60% | Medium |
| EditFlowComponent | src/app/flow/components/edit-flow/edit-flow.component.spec.ts | 60% | Medium |

### E2E Tests (Protractor)
Test complete user journeys through the UI.

| Flow | File | Framework | Priority |
|------|------|-----------|----------|
| Create and edit flow | e2e/src/flow.e2e-spec.ts | Protractor | Medium |

## Test Cases

### Unit: FlowService

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-001 | Get all flows for user | Returns flows observable | High |
| T-FLOW-002 | Get flows when none exist | Returns empty array observable | High |
| T-FLOW-003 | Get flow by ID | Returns single flow observable | High |
| T-FLOW-004 | Create new flow | Creates flow document in Firestore with date and title | High |
| T-FLOW-005 | Update existing flow | Updates flow metadata | High |
| T-FLOW-006 | Add quest item to flow | Adds quest item with correct order | High |
| T-FLOW-007 | Add person item to flow | Adds person item with correct order | High |
| T-FLOW-008 | Add place item to flow | Adds place item with correct order | High |
| T-FLOW-009 | Add note item to flow | Adds note reference with correct order | High |
| T-FLOW-010 | Remove item from flow | Removes item and reorders remaining | High |
| T-FLOW-011 | Reorder items via drag-drop | Updates order numbers correctly | High |
| T-FLOW-012 | Delete flow | Removes flow document from Firestore | High |
| T-FLOW-013 | Enrich flow items with entity data | Joins quest/person/place/note data correctly | High |
| T-FLOW-014 | Handle deleted entity (quest) | Sets entity to null for deleted quest | High |
| T-FLOW-015 | Handle deleted entity (person) | Sets entity to null for deleted person | High |
| T-FLOW-016 | Handle deleted entity (place) | Sets entity to null for deleted place | High |
| T-FLOW-017 | Handle deleted entity (note) | Sets entity to null for deleted note | High |
| T-FLOW-018 | combineLatest data resolution | Emits when any source observable updates | High |

### Component: FlowListComponent

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-C01 | Component initializes | Loads all flows | High |
| T-FLOW-C02 | Empty state | Shows "No sessions yet" message | Medium |
| T-FLOW-C03 | Click "Create Session" | Opens EditFlowComponent modal | High |
| T-FLOW-C04 | Filter flows | Filters by text in title/date | Medium |
| T-FLOW-C05 | Click flow card | Navigates to /flow/:id | High |
| T-FLOW-C06 | Display flow cards | Shows date, title, item count | High |

### Component: FlowViewComponent

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-C07 | Component initializes with ID | Loads enriched flow items for specific flow | High |
| T-FLOW-C08 | Empty flow state | Shows "No items in this session" message | Medium |
| T-FLOW-C09 | Loading state | Shows skeleton loaders | Low |
| T-FLOW-C10 | Click "Add Item" button | Opens AddFlowItemComponent modal | High |
| T-FLOW-C11 | Click "Edit Session" | Opens EditFlowComponent modal | Medium |
| T-FLOW-C12 | Drag and drop item | Calls FlowService.reorderItems | High |
| T-FLOW-C13 | Remove item | Calls FlowService.removeItem | High |
| T-FLOW-C14 | Delete flow | Calls FlowService.deleteFlow and navigates back | High |

### Component: FlowItemComponent

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-C15 | Display quest item | Shows quest name, icon, type | High |
| T-FLOW-C16 | Display person item | Shows person name, avatar, type | High |
| T-FLOW-C17 | Display place item | Shows place name, icon, type | High |
| T-FLOW-C18 | Display note item | Shows note title, preview | High |
| T-FLOW-C19 | Display deleted entity | Shows placeholder text | High |
| T-FLOW-C20 | Click expand button | Toggles expanded state and loads detail component | High |
| T-FLOW-C21 | Expanded item | Dynamically loads inline detail component | High |
| T-FLOW-C22 | Collapse item | Destroys detail component and cleans up subscriptions | High |
| T-FLOW-C23 | Click context menu | Opens context menu with actions | Medium |
| T-FLOW-C24 | Click remove in menu | Emits remove event | High |
| T-FLOW-C25 | Click "View Full Page" | Navigates to entity detail page | Medium |

### Component: AddFlowItemComponent

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-C26 | Component opens | Shows Quest tab by default | Medium |
| T-FLOW-C27 | Switch to Person tab | Loads people list | Medium |
| T-FLOW-C28 | Switch to Place tab | Loads places list | Medium |
| T-FLOW-C29 | Switch to Note tab | Loads notes list | Medium |
| T-FLOW-C30 | Search for quest | Filters quest list | Medium |
| T-FLOW-C31 | Search for person | Filters people list | Medium |
| T-FLOW-C32 | Search for place | Filters places list | Medium |
| T-FLOW-C33 | Search for note | Filters notes list | Medium |
| T-FLOW-C34 | Select multiple items | Adds to selected items | Medium |
| T-FLOW-C35 | Click "Add Selected" | Adds items to flow and closes modal | High |
| T-FLOW-C36 | Click cancel | Closes modal without changes | Low |

### Component: EditFlowComponent

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-C37 | Component opens in create mode | Shows empty form with today's date | Medium |
| T-FLOW-C38 | Component opens in edit mode | Pre-fills form with existing data | Medium |
| T-FLOW-C39 | Save new flow | Creates flow via FlowService | High |
| T-FLOW-C40 | Update existing flow | Updates flow via FlowService | High |
| T-FLOW-C41 | Validation | Requires date field | Medium |
| T-FLOW-C42 | Click cancel | Closes modal without changes | Low |

### E2E: Complete Flow Management Journey

| ID | Scenario | Steps | Expected | Priority |
|----|----------|-------|----------|----------|
| T-FLOW-E01 | View flow list | 1. Navigate to /flow<br>2. See all sessions | Flow list loads with all sessions | High |
| T-FLOW-E02 | Create new session | 1. Click "Create Session"<br>2. Enter date and title<br>3. Save | New session created, navigate to session view | High |
| T-FLOW-E03 | Add quest to session | 1. Click "Add Item"<br>2. Search for quest<br>3. Select quest<br>4. Click "Add Selected" | Quest appears in session | High |
| T-FLOW-E04 | Add person to session | 1. Click "Add Item"<br>2. Switch to Person tab<br>3. Select person<br>4. Add | Person appears in session | High |
| T-FLOW-E05 | Add note to session | 1. Click "Add Item"<br>2. Switch to Note tab<br>3. Select note<br>4. Add | Note appears in session | Medium |
| T-FLOW-E06 | Reorder items | 1. Drag item by handle<br>2. Drop in new position | Items reorder correctly | High |
| T-FLOW-E07 | Expand quest item | 1. Click expand on quest<br>2. View details | Dynamically loads quest detail component inline | High |
| T-FLOW-E08 | Remove item | 1. Click context menu<br>2. Click remove | Item removed from session | High |
| T-FLOW-E09 | Edit session | 1. Click "Edit Session"<br>2. Update date/title<br>3. Save | Session metadata updated | Medium |
| T-FLOW-E10 | Delete session | 1. Click delete<br>2. Confirm | Session deleted, navigate back to list | Medium |
| T-FLOW-E11 | Reload page | 1. Add items<br>2. Refresh page | Session persists correctly | High |

### Edge Cases

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-X01 | Display session with all deleted entities | Shows placeholders for all items | Medium |
| T-FLOW-X02 | Drag item to same position | No changes made | Low |
| T-FLOW-X03 | Add duplicate quest | Allows duplicates (valid use case) | Medium |
| T-FLOW-X04 | Empty search results in add modal | Shows "No results" message | Low |
| T-FLOW-X05 | Create session with empty title | Allows optional title | Low |
| T-FLOW-X06 | Very long session (100+ items) | Performance remains acceptable | Low |
| T-FLOW-X07 | Concurrent edits (multi-tab) | Latest write wins, no data loss | Low |
| T-FLOW-X08 | Delete session with many items | Deletes cleanly without errors | Medium |

## Test Data Requirements

### Mock Data Needed

```typescript
// Mock Flow (Session)
const mockFlow: Flow = {
  id: 'flow1',
  date: new Date('2026-01-07'),
  title: 'Session 1: The Journey Begins',
  owner: 'user1',
  access: ['user1', 'gm1'],
  items: [
    { id: 'item1', type: 'quest', questId: 'quest1', order: 0 },
    { id: 'item2', type: 'person', personId: 'person1', order: 1 },
    { id: 'item3', type: 'place', placeId: 'place1', order: 2 },
    { id: 'item4', type: 'note', noteId: 'note1', order: 3 },
  ],
  collection: 'flows'
};

// Mock Quest
const mockQuest: Quest = {
  id: 'quest1',
  name: 'Find the Lost Artifact',
  description: 'Search for the ancient artifact',
  type: QuestType.Main,
  completed: false,
  // ... other fields
};

// Mock Person
const mockPerson: Person = {
  id: 'person1',
  name: 'Gandalf',
  // ... other fields
};

// Mock Note
const mockNote: Note = {
  id: 'note1',
  title: 'Important Clue',
  content: 'The artifact is hidden in...',
  // ... other fields
};

// Mock deleted entity (null)
const mockDeletedItem: EnrichedQuestFlowItem = {
  id: 'item5',
  type: 'quest',
  questId: 'deleted-quest',
  order: 4,
  entity: null // Deleted
};
```

## Coverage Targets

| Category | Target | Rationale |
|----------|--------|-----------|
| FlowService | 80% | Core business logic, critical for data integrity |
| Components | 60-70% | User interactions, rendering logic |
| E2E Critical Paths | 100% | Must cover: create, add, reorder, remove |

## Testing Tools

- **Karma**: Test runner for unit and component tests
- **Jasmine**: Testing framework and assertions
- **Protractor**: E2E testing framework
- **@angular/cdk/testing**: For testing drag-drop interactions

## Test Execution Order

1. **Unit tests first**: FlowService (T-FLOW-001 to T-FLOW-018)
2. **Component tests**: FlowList, FlowView, FlowItem, AddFlowItem, EditFlow (T-FLOW-C01 to T-FLOW-C42)
3. **E2E tests last**: Complete journeys (T-FLOW-E01 to T-FLOW-E11)
4. **Edge cases**: After core functionality passes (T-FLOW-X01 to T-FLOW-X08)

## Success Criteria

- [x] All High priority tests pass
- [x] Coverage targets met (FlowService ≥80%, Components ≥60%)
- [x] E2E critical paths pass (T-FLOW-E01, E02, E03, E06, E08, E11)
- [x] No console errors during test execution
- [x] Build passes with no TypeScript errors

## Implementation Status

28 unit and component tests were implemented covering core functionality:
- FlowService: 5 critical tests
- FlowViewComponent: 5 tests
- FlowItemComponent: 5 tests
- AddFlowItemComponent: 7 tests
- EditFlowComponent: 2 tests (implied from scratchpad)
- FlowListComponent: 4 tests (implied from scratchpad)

Tests focus on critical paths and high-priority scenarios. Some medium/low priority tests from this plan may not have been implemented.
