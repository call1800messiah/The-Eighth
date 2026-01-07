# Flow Feature - Test Plan

## Overview
Testing strategy for the session flow planner feature, covering service logic, component interactions, and end-to-end user journeys.

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
| FlowViewComponent | src/app/flow/components/flow-view/flow-view.component.spec.ts | 70% | High |
| FlowItemComponent | src/app/flow/components/flow-item/flow-item.component.spec.ts | 70% | High |
| AddFlowItemComponent | src/app/flow/components/add-flow-item/add-flow-item.component.spec.ts | 60% | Medium |
| SessionMarkerComponent | src/app/flow/components/session-marker/session-marker.component.spec.ts | 60% | Medium |
| GeneralNoteComponent | src/app/flow/components/general-note/general-note.component.spec.ts | 60% | Medium |

### E2E Tests (Protractor)
Test complete user journeys through the UI.

| Flow | File | Framework | Priority |
|------|------|-----------|----------|
| Create and edit flow | e2e/src/flow.e2e-spec.ts | Protractor | Medium |

## Test Cases

### Unit: FlowService

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-001 | Get flow for campaign | Returns flow observable | High |
| T-FLOW-002 | Get flow when none exists | Returns null observable | High |
| T-FLOW-003 | Create new flow | Creates flow document in Firestore | High |
| T-FLOW-004 | Add quest item to flow | Adds quest item with correct order | High |
| T-FLOW-005 | Add person item to flow | Adds person item with correct order | High |
| T-FLOW-006 | Add place item to flow | Adds place item with correct order | High |
| T-FLOW-007 | Add session marker | Adds session marker with date | Medium |
| T-FLOW-008 | Add general note | Adds note with content | Medium |
| T-FLOW-009 | Remove item from flow | Removes item and reorders remaining | High |
| T-FLOW-010 | Reorder items via drag-drop | Updates order numbers correctly | High |
| T-FLOW-011 | Update session marker date | Updates date field | Low |
| T-FLOW-012 | Update general note content | Updates content field | Low |
| T-FLOW-013 | Enrich flow items with entity data | Joins quest/person/place data correctly | High |
| T-FLOW-014 | Handle deleted entity (quest) | Sets entity to null for deleted quest | High |
| T-FLOW-015 | Handle deleted entity (person) | Sets entity to null for deleted person | High |
| T-FLOW-016 | Handle deleted entity (place) | Sets entity to null for deleted place | High |
| T-FLOW-017 | combineLatest data resolution | Emits when any source observable updates | High |

### Component: FlowViewComponent

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-C01 | Component initializes | Loads enriched flow items | High |
| T-FLOW-C02 | Empty flow state | Shows "Add Your First Item" message | Medium |
| T-FLOW-C03 | Loading state | Shows skeleton loaders | Low |
| T-FLOW-C04 | Error state | Shows error message with retry | Medium |
| T-FLOW-C05 | Click "Add Item" button | Opens AddFlowItemComponent modal | High |
| T-FLOW-C06 | Click "Add Session Marker" | Adds session marker to flow | Medium |
| T-FLOW-C07 | Click "Add Note" | Adds general note to flow | Medium |
| T-FLOW-C08 | Drag and drop item | Calls FlowService.reorderItems | High |
| T-FLOW-C09 | Remove item | Calls FlowService.removeItem | High |
| T-FLOW-C10 | Filter flow items | Filters items by search text | Low |

### Component: FlowItemComponent

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-C11 | Display quest item | Shows quest name, icon, type | High |
| T-FLOW-C12 | Display person item | Shows person name, avatar, type | High |
| T-FLOW-C13 | Display place item | Shows place name, icon, type | High |
| T-FLOW-C14 | Display deleted entity | Shows placeholder text | High |
| T-FLOW-C15 | Click expand button | Toggles expanded state | High |
| T-FLOW-C16 | Expanded quest item | Shows description, notes, related entities | High |
| T-FLOW-C17 | Expanded person item | Shows description, notes, related entities | High |
| T-FLOW-C18 | Expanded place item | Shows description, notes | High |
| T-FLOW-C19 | Click context menu | Opens context menu with actions | Medium |
| T-FLOW-C20 | Click remove in menu | Emits remove event | High |
| T-FLOW-C21 | Click "View Full Page" | Navigates to entity detail page | Medium |

### Component: AddFlowItemComponent

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-C22 | Component opens | Shows Quest tab by default | Medium |
| T-FLOW-C23 | Switch to Person tab | Loads people list | Medium |
| T-FLOW-C24 | Switch to Place tab | Loads places list | Medium |
| T-FLOW-C25 | Switch to Session tab | Shows date picker | Medium |
| T-FLOW-C26 | Switch to Note tab | Shows text area | Medium |
| T-FLOW-C27 | Search for quest | Filters quest list | Medium |
| T-FLOW-C28 | Search for person | Filters people list | Medium |
| T-FLOW-C29 | Search for place | Filters places list | Medium |
| T-FLOW-C30 | Select multiple quests | Adds to selected items | Medium |
| T-FLOW-C31 | Click "Add Selected" | Adds items to flow and closes modal | High |
| T-FLOW-C32 | Add session marker | Adds marker with selected date | Medium |
| T-FLOW-C33 | Add general note | Adds note with entered text | Medium |
| T-FLOW-C34 | Click cancel | Closes modal without changes | Low |

### Component: SessionMarkerComponent

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-C35 | Display session marker | Shows formatted date | Medium |
| T-FLOW-C36 | Click delete | Emits remove event | Low |
| T-FLOW-C37 | Edit date (future) | Updates date via FlowService | Low |

### Component: GeneralNoteComponent

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-C38 | Display note | Shows note content | Medium |
| T-FLOW-C39 | Click edit | Enables inline editing | Medium |
| T-FLOW-C40 | Edit note content | Updates content via FlowService | Medium |
| T-FLOW-C41 | Click delete | Emits remove event | Low |

### E2E: Complete Flow Management Journey

| ID | Scenario | Steps | Expected | Priority |
|----|----------|-------|----------|----------|
| T-FLOW-E01 | Create first flow | 1. Navigate to /flow<br>2. See empty state<br>3. Click "Add Your First Item" | Flow view loads, empty state shown | High |
| T-FLOW-E02 | Add quest to flow | 1. Click "Add Item"<br>2. Search for quest<br>3. Select quest<br>4. Click "Add Selected" | Quest appears in flow | High |
| T-FLOW-E03 | Add person to flow | 1. Click "Add Item"<br>2. Switch to Person tab<br>3. Select person<br>4. Add | Person appears in flow | High |
| T-FLOW-E04 | Add session marker | 1. Click "Add Session Marker"<br>2. Select date | Session marker divides flow | Medium |
| T-FLOW-E05 | Add general note | 1. Click "Add Note"<br>2. Enter text<br>3. Confirm | Note appears in flow | Medium |
| T-FLOW-E06 | Reorder items | 1. Drag item by handle<br>2. Drop in new position | Items reorder correctly | High |
| T-FLOW-E07 | Expand quest item | 1. Click expand on quest<br>2. View details | Shows description, notes, related | Medium |
| T-FLOW-E08 | Remove item | 1. Click context menu<br>2. Click remove | Item removed from flow | High |
| T-FLOW-E09 | Navigate to entity | 1. Expand item<br>2. Click "View Full Page" | Navigates to entity detail | Low |
| T-FLOW-E10 | Reload page | 1. Add items<br>2. Refresh page | Flow persists correctly | High |

### Edge Cases

| ID | Scenario | Expected Outcome | Priority |
|----|----------|------------------|----------|
| T-FLOW-X01 | Add item when flow doesn't exist | Creates flow then adds item | High |
| T-FLOW-X02 | Display flow with all deleted entities | Shows placeholders for all items | Medium |
| T-FLOW-X03 | Drag item to same position | No changes made | Low |
| T-FLOW-X04 | Add duplicate quest | Allows duplicates (valid use case) | Medium |
| T-FLOW-X05 | Empty search results | Shows "No results" message | Low |
| T-FLOW-X06 | Add note with empty content | Prevents addition or shows validation | Medium |
| T-FLOW-X07 | Very long flow (100+ items) | Performance remains acceptable | Low |
| T-FLOW-X08 | Concurrent edits (multi-tab) | Latest write wins, no data loss | Low |

## Test Data Requirements

### Mock Data Needed

```typescript
// Mock Flow
const mockFlow: Flow = {
  id: 'flow1',
  campaignId: 'campaign1',
  createdBy: 'user1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-07'),
  access: ['user1', 'gm1'],
  items: [
    { id: 'item1', type: 'quest', questId: 'quest1', order: 0 },
    { id: 'item2', type: 'session-marker', date: new Date('2026-01-05'), order: 1 },
    { id: 'item3', type: 'person', personId: 'person1', order: 2 },
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

// Mock deleted entity (null)
const mockDeletedItem: EnrichedQuestFlowItem = {
  id: 'item4',
  type: 'quest',
  questId: 'deleted-quest',
  order: 3,
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

1. **Unit tests first**: FlowService (T-FLOW-001 to T-FLOW-017)
2. **Component tests**: FlowView, FlowItem, AddFlowItem (T-FLOW-C01 to T-FLOW-C41)
3. **E2E tests last**: Complete journeys (T-FLOW-E01 to T-FLOW-E10)
4. **Edge cases**: After core functionality passes (T-FLOW-X01 to T-FLOW-X08)

## Success Criteria

- [ ] All High priority tests pass
- [ ] Coverage targets met (FlowService ≥80%, Components ≥60%)
- [ ] E2E critical paths pass (T-FLOW-E01, E02, E03, E06, E08, E10)
- [ ] No console errors during test execution
- [ ] Build passes with no TypeScript errors
