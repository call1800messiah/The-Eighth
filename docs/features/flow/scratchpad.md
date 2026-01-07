# Flow Feature - Scratchpad

## Domain
**Domain**: Campaign Management
**Domain Prefix**: N/A (standalone feature)

## Implementation Notes
- Angular CDK needs to be installed: `npm install @angular/cdk@^18.0.0`
- FlowService will subscribe to 4 observables: flow$, quests$, people$, places$
- Use `moveItemInArray` from @angular/cdk/drag-drop for reordering
- Flow items auto-filter out deleted entities (entity === null) before rendering

## Cross-References to Add
After implementation, update these feature docs:
- **quests**: Note that quests can be added to flows
- **people**: Note that people can be added to flows
- **places**: Note that places can be added to flows
