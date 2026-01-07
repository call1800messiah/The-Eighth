# Session Flow Specification

## Overview
A session flow planner that allows GMs to create an ordered, editable sequence of quest steps with linked NPCs and places. The flow is a lightweight organizational tool per campaign that stores only item order and general notes, with session start markers to indicate session boundaries.

## Requirements
- [ ] Single continuous flow per campaign
- [ ] Support multiple item types: quests, people, places, session markers, general notes
- [ ] Drag and drop reordering
- [ ] Multiple methods to add items:
  - Search and add existing entities
  - Drag from sidebar
  - Quick create + add new entities
- [ ] Session start markers with date/timestamp
- [ ] General notes (not attached to entities)
- [ ] Fully editable during and after sessions
- [ ] Auto-remove items when referenced entities are deleted
- [ ] GM-only access (no player view)
- [ ] Dedicated route: `/flow`

## User Stories
- As a GM, I want to plan my session by creating an ordered list of quest steps so that I can stay organized during play
- As a GM, I want to link NPCs and places to quest steps so that I have quick access to relevant information
- As a GM, I want to add session start markers so that I can track what happened in each session
- As a GM, I want to add general notes between items so that I can remember important details or improvised content
- As a GM, I want to reorder items with drag and drop so that I can adjust my session plan easily
- As a GM, I want to add items in multiple ways (search, drag, quick create) so that I can work efficiently

## Data Model

### Flow Document (Firestore)
Collection: `flows`

```typescript
interface Flow {
  id: string;
  campaignId: string; // Reference to campaign
  createdBy: string; // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  access: string[]; // GM users only
  items: FlowItem[]; // Ordered array
}
```

### FlowItem (embedded in Flow)

```typescript
type FlowItem =
  | QuestFlowItem
  | PersonFlowItem
  | PlaceFlowItem
  | SessionMarkerFlowItem
  | GeneralNoteFlowItem;

interface BaseFlowItem {
  id: string; // nanoid for item
  order: number; // For sorting
}

interface QuestFlowItem extends BaseFlowItem {
  type: 'quest';
  questId: string; // Reference to quest document
}

interface PersonFlowItem extends BaseFlowItem {
  type: 'person';
  personId: string; // Reference to person document
}

interface PlaceFlowItem extends BaseFlowItem {
  type: 'place';
  placeId: string; // Reference to place document
}

interface SessionMarkerFlowItem extends BaseFlowItem {
  type: 'session-marker';
  date: Timestamp; // Session date
}

interface GeneralNoteFlowItem extends BaseFlowItem {
  type: 'general-note';
  content: string; // Markdown text
}
```

## Constraints
- One flow per campaign (1:1 relationship)
- Only GMs can create/edit flows
- Flow items reference existing entities (quests, people, places)
- When an entity is deleted, its flow item is auto-removed
- General notes are the only flow items with their own data
- All other notes are edited on the entity itself, not in the flow

## Integration
- **Campaigns**: Each campaign can have one flow
- **Quests**: Quests can be added to flow, changes reflected immediately
- **People**: People can be added to flow
- **Places**: Places can be added to flow
- **Navigation**: Add "Session Flow" to main navigation menu

## Bill of Materials

### Existing Code to Reuse
| Item | Location | Purpose |
|------|----------|---------|
| **Core Services** | | |
| ApiService | src/app/core/services/api.service.ts | Firestore queries and mutations |
| DataService | src/app/core/services/data.service.ts | CRUD with automatic permission handling |
| AuthService | src/app/core/services/auth.service.ts | Current user state |
| ConfigService | src/app/core/services/config.service.ts | nanoid generation for flow item IDs |
| NavigationService | src/app/core/services/navigation.service.ts | Add flow to navigation menu |
| **Feature Services** | | |
| QuestsService | src/app/quests/services/quests.service.ts | Load quest data for flow items |
| PeopleService | src/app/people/services/people.service.ts | Load person data for flow items |
| PlaceService | src/app/places/services/place.service.ts | Load place data for flow items |
| **Shared Components** | | |
| DashboardComponent | src/app/shared/components/dashboard/ | Layout wrapper for flow pages |
| ContainerComponent | src/app/shared/components/container/ | Content container styling |
| AvatarComponent | src/app/shared/components/avatar/ | Display person avatars in flow items |
| PopoverComponent | src/app/shared/components/popover/ | Modal for add item UI |
| ContextMenuComponent | src/app/shared/components/context-menu/ | Right-click menu for flow items |
| **Patterns** | | |
| AuthGuardService | src/app/core/services/auth-guard.service.ts | Protect /flow route (GM only) |
| Routing pattern | src/app/quests/quests-routing.module.ts | DashboardComponent wrapper with child routes |
| Service pattern | src/app/quests/services/quests.service.ts | BehaviorSubject state management |

### New Files to Create
| File | Type | Purpose |
|------|------|---------|
| **Module** | | |
| src/app/flow/flow.module.ts | Module | Feature module declaration |
| src/app/flow/flow-routing.module.ts | Routing | Route configuration |
| src/app/flow/index.ts | Barrel | Module exports |
| **Models** | | |
| src/app/flow/models/index.ts | Barrel | Model exports |
| src/app/flow/models/flow.ts | Interface | Flow entity (app model) |
| src/app/flow/models/flow.db.ts | Interface | FlowDB (Firestore schema) |
| src/app/flow/models/flow-item.ts | Type/Interface | FlowItem union type and interfaces |
| src/app/flow/models/flow-item-type.enum.ts | Enum | FlowItem type enum |
| **Services** | | |
| src/app/flow/services/flow.service.ts | Service | Flow CRUD, BehaviorSubject state |
| **Components** | | |
| src/app/flow/components/flow-view/flow-view.component.ts | Component | Main flow page (list all items) |
| src/app/flow/components/flow-view/flow-view.component.html | Template | Flow view template |
| src/app/flow/components/flow-view/flow-view.component.scss | Styles | Flow view styles |
| src/app/flow/components/flow-view/flow-view.component.spec.ts | Test | Flow view tests |
| src/app/flow/components/flow-item/flow-item.component.ts | Component | Display single flow item |
| src/app/flow/components/flow-item/flow-item.component.html | Template | Flow item template |
| src/app/flow/components/flow-item/flow-item.component.scss | Styles | Flow item styles |
| src/app/flow/components/flow-item/flow-item.component.spec.ts | Test | Flow item tests |
| src/app/flow/components/add-flow-item/add-flow-item.component.ts | Component | Add item popover UI |
| src/app/flow/components/add-flow-item/add-flow-item.component.html | Template | Add item template |
| src/app/flow/components/add-flow-item/add-flow-item.component.scss | Styles | Add item styles |
| src/app/flow/components/add-flow-item/add-flow-item.component.spec.ts | Test | Add item tests |
| src/app/flow/components/session-marker/session-marker.component.ts | Component | Display session marker |
| src/app/flow/components/session-marker/session-marker.component.html | Template | Session marker template |
| src/app/flow/components/session-marker/session-marker.component.scss | Styles | Session marker styles |
| src/app/flow/components/session-marker/session-marker.component.spec.ts | Test | Session marker tests |
| src/app/flow/components/general-note/general-note.component.ts | Component | Display/edit general note |
| src/app/flow/components/general-note/general-note.component.html | Template | General note template |
| src/app/flow/components/general-note/general-note.component.scss | Styles | General note styles |
| src/app/flow/components/general-note/general-note.component.spec.ts | Test | General note tests |

### Dependencies to Add
| Package | Version | Purpose |
|---------|---------|---------|
| @angular/cdk | ^18.0.0 | Drag and drop functionality (cdkDrag, cdkDropList) |

### Routing Changes
| File | Change |
|------|--------|
| src/app/app-routing.module.ts | Add flow lazy-loaded route |
| src/app/core/services/navigation.service.ts | Add "Session Flow" menu entry with icon |

### Related Features
This feature is in the **campaign management** domain.

| Feature | Relationship | Shared Patterns |
|---------|--------------|-----------------|
| quests | References quests in flow | Service pattern, BehaviorSubject, DashboardComponent |
| people | References people in flow | Service pattern, BehaviorSubject, AvatarComponent |
| places | References places in flow | Service pattern, BehaviorSubject |
| overview | Campaign context | Campaign-based filtering |

## Architecture Decisions

### Data Storage
**Decision**: Embedded array in Flow document
**Rationale**: Simpler queries, atomic updates, sufficient for expected item count (<1000)

### Campaign Association
**Decision**: `campaignId` field on Flow document
**Rationale**: Simple query pattern, single campaign per app simplifies logic

### Data Resolution
**Decision**: Client-side join with `combineLatest`
**Rationale**: Reuses existing QuestsService, PeopleService, PlaceService BehaviorSubjects, always fresh data without duplication

### Campaign Context
**Decision**: Single campaign only (no selection needed)
**Rationale**: App architecture supports only one campaign, simplifies flow loading

### Drag and Drop
**Decision**: Angular CDK (`@angular/cdk/drag-drop`)
**Rationale**: Well-tested, accessible, recommended Angular solution

### UI Pattern
**Decision**: Match existing quest/people list patterns
**Rationale**: Consistent UX, reuse ContainerComponent, TopBarFilterComponent, standard layouts

### Entity Interaction
**Decision**: Expand inline on click (not navigate)
**Rationale**: Keep user in flow context, show description + notes + related entities inline

### Add Item UX
**Decision**: Single modal with tabs for each item type
**Rationale**: Cleaner UI than multiple buttons, supports search/select pattern for entities

## Open Questions
None - all requirements clarified during discussion phase.
