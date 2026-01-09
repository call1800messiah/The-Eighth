# Flow Feature - Scratchpad

## Implementation Notes: Dynamic Detail Views

### Components Identified
- **Quests**: `QuestComponent` (src/app/quests/components/quest/quest.component.ts)
- **People**: `PersonComponent` (src/app/people/components/person/person.component.ts)
- **Places**: `PlaceComponent` (src/app/places/components/place/place.component.ts)

### Problem
These components currently get the entity ID from `ActivatedRoute` route params. They expect to be used in a routed context.

### Solution: Refactor Detail Components
Modify each detail component to support both routed and embedded usage:

1. Add optional `@Input() entityId?: string` to each component
2. In `ngOnInit()`, check if `entityId` input is provided:
   - If yes: use it directly to load data
   - If no: fall back to reading from `ActivatedRoute` (existing behavior)
3. This allows components to work both ways:
   - Routed: `/quests/:id` → reads from route
   - Embedded: `<app-quest [entityId]="'quest123'">` → reads from input

### Files to Modify
- src/app/quests/components/quest/quest.component.ts
- src/app/people/components/person/person.component.ts
- src/app/places/components/place/place.component.ts

### FlowItemComponent Implementation
1. Use `ViewContainerRef` in template
2. On expand: `ViewContainerRef.createComponent()` to dynamically create component
3. Set `entityId` input via `componentRef.setInput('entityId', id)`
4. Store ComponentRef to destroy later
5. On collapse: call `componentRef.destroy()` to clean up subscriptions

### Memory Management
- ComponentRef.destroy() will trigger ngOnDestroy on the child component
- Existing subscription cleanup in detail components will handle Firestore unsubscribes
- Verify with Chrome DevTools Memory profiler

## Implementation Complete
Dynamic detail view loading has been implemented:
- QuestComponent, PersonComponent, PlaceComponent now support embedded usage via `@Input() entityId`
- FlowItemComponent dynamically loads detail components on expand
- Components are properly destroyed on collapse to prevent memory leaks
- Modules updated to export and import detail components

## Verification Pending
- Build check (ng build)
- Lint check (ng lint)
- All tests passing (ng test)
- Manual testing of expand/collapse functionality
- Memory leak verification (Chrome DevTools)
- Code style review
- Quality standards verification

## Cross-References to Add
After verification passes, update these feature docs:
- **quests/description.md**: Add flow under "Related Features"
- **people/description.md**: Add flow under "Related Features"
- **places/description.md**: Add flow under "Related Features"
