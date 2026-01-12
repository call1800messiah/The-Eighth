# Session Flow Specification

## Overview
A session flow planner that allows GMs to create multiple sessions, each with an ordered, editable sequence of items (quests, people, places, notes). Each flow represents a single game session with a date and optional title. This is a lightweight organizational tool that stores only item references and order.

## Requirements
- [x] Multiple flows (sessions) per campaign
- [x] Each flow has a date and optional title
- [x] Support multiple item types: quests, people, places, notes
- [x] Drag and drop reordering within a session
- [x] Search and add existing entities from modal
- [x] Reference existing notes from notes feature
- [x] Fully editable during and after sessions
- [x] Auto-remove items when referenced entities are deleted
- [x] GM-only access (no player view)
- [x] Dedicated routes: `/flow` (list), `/flow/:id` (session detail)
- [x] Inline detail views on expand (dynamically loaded)

## User Stories
- As a GM, I want to create multiple sessions with dates so that I can plan and track each game session separately
- As a GM, I want to plan each session by creating an ordered list of quests, NPCs, places, and notes so that I can stay organized during play
- As a GM, I want to link NPCs and places to my session so that I have quick access to relevant information
- As a GM, I want to add notes from my existing notes collection so that I can reference important details or improvised content
- As a GM, I want to reorder items with drag and drop so that I can adjust my session plan easily
- As a GM, I want to see a list of all my sessions so that I can review past sessions and access upcoming plans

## Data Model

### Flow Document (Firestore)
Collection: `flows`

Each flow represents a single game session.

```typescript
interface Flow extends AccessControlledItem {
  id: string;
  date: Date; // Session date
  title?: string; // Optional session title
  owner: string; // User ID
  access: string[]; // GM users only
  items: FlowItem[]; // Ordered array
  collection: 'flows';
}
```

### FlowItem (embedded in Flow)

```typescript
type FlowItem =
  | QuestFlowItem
  | PersonFlowItem
  | PlaceFlowItem
  | NoteFlowItem;

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

interface NoteFlowItem extends BaseFlowItem {
  type: 'note';
  noteId: string; // Reference to note document
}
```

## Constraints
- Multiple flows per user (many sessions)
- Only GMs can create/edit flows
- Flow items reference existing entities (quests, people, places, notes)
- When an entity is deleted, its flow item is auto-removed
- Notes reference existing notes from the notes feature (no inline notes)
- Detail views are dynamically loaded inline to avoid keeping subscriptions open
- All entities are edited through their existing edit modals, not inline in the flow

## Integration
- **Campaigns**: Users can create multiple sessions (flows)
- **Quests**: Quests can be added to sessions, changes reflected immediately, detail view shown inline
- **People**: People can be added to sessions, detail view shown inline
- **Places**: Places can be added to sessions, detail view shown inline
- **Notes**: Notes from notes feature can be added to sessions, detail view shown inline
- **Navigation**: "Sessions" menu item in main navigation
- **Dynamic Components**: Detail components (Quest/Person/Place/Note) refactored to support embedded usage

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

### New Files Created
| File | Type | Purpose |
|------|------|---------|
| **Module** | | |
| src/app/flow/flow.module.ts | Module | Feature module declaration |
| src/app/flow/flow-routing.module.ts | Routing | Route configuration |
| src/app/flow/index.ts | Barrel | Module exports |
| **Models** | | |
| src/app/flow/models/index.ts | Barrel | Model exports |
| src/app/flow/models/flow.ts | Interface | Flow entity (app model) |
| src/app/flow/models/flow-item.ts | Type/Interface | FlowItem union type and interfaces |
| **Services** | | |
| src/app/flow/services/flow.service.ts | Service | Flow CRUD, BehaviorSubject state, entity enrichment |
| **Components** | | |
| src/app/flow/components/flow-list/flow-list.component.* | Component | List all sessions with search/filter |
| src/app/flow/components/flow-view/flow-view.component.* | Component | View single session's items |
| src/app/flow/components/flow-item/flow-item.component.* | Component | Display single flow item, dynamically load detail views |
| src/app/flow/components/add-flow-item/add-flow-item.component.* | Component | Add item popover UI with tabs |
| src/app/flow/components/edit-flow/edit-flow.component.* | Component | Create/edit flow metadata (date, title) |

### Dependencies to Add
| Package | Version | Purpose |
|---------|---------|---------|
| @angular/cdk | ^18.0.0 | Drag and drop functionality (cdkDrag, cdkDropList) |

### Routing
| Route | Component | Purpose |
|-------|-----------|---------|
| /flow | FlowListComponent | List all sessions |
| /flow/:id | FlowViewComponent | View specific session |

### Related Features
This feature is in the **campaign management** domain.

| Feature | Relationship | Shared Patterns |
|---------|--------------|-----------------|
| quests | References quests in sessions | Service pattern, BehaviorSubject, DashboardComponent, dynamic loading |
| people | References people in sessions | Service pattern, BehaviorSubject, AvatarComponent, dynamic loading |
| places | References places in sessions | Service pattern, BehaviorSubject, dynamic loading |
| notes | References notes in sessions | Service pattern, BehaviorSubject, dynamic loading |
| overview | Campaign context | Access control filtering |

## Architecture Decisions

### Session Model
**Decision**: Each flow is a separate session with date and optional title
**Rationale**: Clear separation between sessions, allows chronological organization, easier to archive/search by date

### Data Storage
**Decision**: Embedded array of items in each Flow document
**Rationale**: Simpler queries, atomic updates, sufficient for expected item count per session (<100)

### Data Resolution
**Decision**: Client-side join with `combineLatest`
**Rationale**: Reuses existing QuestsService, PeopleService, PlaceService, NotesService BehaviorSubjects, always fresh data without duplication

### Drag and Drop
**Decision**: Angular CDK (`@angular/cdk/drag-drop`)
**Rationale**: Well-tested, accessible, recommended Angular solution

### UI Pattern
**Decision**: Match existing quest/people list patterns
**Rationale**: Consistent UX, reuse ContainerComponent, TopBarFilterComponent, standard layouts

### Entity Interaction
**Decision**: Dynamically load full detail view inline when expanded
**Rationale**: Keep user in session context, show complete entity detail view (same as detail pages), lazy load only when expanded, destroy when collapsed to avoid keeping Firestore subscriptions open

### Add Item UX
**Decision**: Single modal with tabs for each item type
**Rationale**: Cleaner UI than multiple buttons, supports search/select pattern for entities

### Notes Integration
**Decision**: Reference existing notes via noteId (not inline notes)
**Rationale**: Single source of truth, notes can be updated independently, reuse existing notes feature
