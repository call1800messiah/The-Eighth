# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TheEighth is an Angular 18 application for managing tabletop RPG campaigns. It uses Firebase (Firestore + Auth + Storage) as the backend and supports multi-tenant deployments for different game systems (e.g., The Dark Eye 5th edition, custom systems).

## Common Commands

### Development
```bash
# Start dev server (http://localhost:4200)
ng serve
# or
npm start

# Build for production
ng build --configuration=production

# Run all tests
ng test

# Run single test file
ng test --include='**/path/to/file.spec.ts'

# Lint code
ng lint

# E2E tests
ng e2e
```

### Firebase Deployment
```bash
# Login to Firebase (one-time)
firebase login

# Select Firebase project
firebase use YOUR_TENANT_NAME

# Build and deploy to Firebase Hosting
ng build --configuration=production
firebase deploy
```

## Setup Requirements

### Environment Configuration
1. Create `.env` file in root:
   ```
   NG_APP_TENANT=YOUR_TENANT_NAME
   ```

2. Create `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     name: 'dev',
     production: false,
     tenant: process.env.NG_APP_TENANT.trim(),
     tenantData: {
       YOUR_TENANT_NAME: {
         firebase: {
           apiKey: '',
           authDomain: '',
           databaseURL: '',
           projectId: '',
           storageBucket: '',
           messagingSenderId: '',
           appId: ''
         },
       },
     },
   };
   ```

3. For production, create `src/environments/environment.prod.ts` with similar structure but `production: true`.

## Architecture

### Multi-Tenant System
- **Tenant selection**: Set via `NG_APP_TENANT` in `.env` file
- **Firebase config**: Read from `environment.tenantData[environment.tenant].firebase`
- **Tenant-specific assets**:
  - Rules JSON: `assets/{tenant}/rules.json`
  - Styles: `src/scss/{tenant}.scss` (loaded globally in angular.json)
  - Body class: `document.body.classList.add(environment.tenant)` for tenant-specific CSS
- **Known tenants**: `tde5` (The Dark Eye 5e), `the-eighth` (custom system)

### Module Organization
- **CoreModule**: Singleton services (API, Auth, Data, Config, Navigation, Popover, Storage, User, Util), Firebase initialization, app-wide layout (Header, Footer, Sidebar)
- **SharedModule**: Reusable components, directives, pipes (exported to other modules)
- **Feature Modules**: Lazy-loaded via routing (achievements, auth, combat, dice, inventory, notes, overview, people, places, projects, quests, rules)

### Key Services

#### Core Services (`src/app/core/services/`)
- **ApiService**: Low-level Firebase wrapper (AngularFirestore + AngularFireAuth)
- **AuthService**: Authentication state management via BehaviorSubject `user$`, combines Firebase user + Firestore user data
- **DataService**: Higher-level CRUD operations, handles document permissions (access control), manages info/notes
- **UserService**: User directory from Firestore `users` collection
- **StorageService**: Firebase Storage file upload/download
- **ConfigService**: App configuration, sidebar state (localStorage), ID generation (nanoid)
- **NavigationService**: Navigation state (current page, back button, menu items)
- **PopoverService**: Dynamic modal/popover management (single popover enforcement)
- **UtilService**: Sorting helpers, slugify, DataURL conversion

#### Feature Services
- **PeopleService**: Complex deserialization merging people + places + rules, resolves relationships and rule references
- **RulesService**: Loads static rules from `assets/{tenant}/rules.json` + dynamic rules from Firestore (advantages, disadvantages, feats, skills, spells, liturgies, cantrips)
- **CombatService**: Combat encounter management with initiative tracking
- **CampaignService**: Campaign metadata CRUD

### State Management Pattern
- **No NgRx/Akita**: Uses RxJS BehaviorSubjects in services
- **Data flow**: ApiService → Feature Services (deserialize/transform/combine) → BehaviorSubjects → Components subscribe
- **Reactive composition**: `combineLatest`/`withLatestFrom` for combining data streams

### Access Control
- **Document-level permissions**: `access: string[]` field on Firestore documents
- **GM users**: See everything (isGM flag on User)
- **Creators**: Automatically granted access + all GM users
- **Queries**: Filtered via `.where('access', 'array-contains', userId)`

### Routing
- **All routes lazy-loaded** except `auth`
- **Protected by `AuthGuardService`** (canLoad): All routes except `auth`
- **Default redirect**: `/` → `/overview`
- **Feature routing pattern**: DashboardComponent wrapper with child routes for list/detail views

### Component Patterns
- **Dashboard Pattern**: Most features use shared `DashboardComponent` as layout wrapper
- **Popover-based editing**: Edit forms loaded dynamically via PopoverService with props passed via resolver
- **Shared Components** (`src/app/shared/components/`):
  - Forms: EditImageComponent, EditInfoComponent, EditAttributeComponent, EditAccessComponent, EditTagsComponent
  - Display: AvatarComponent, BarComponent, InfoBoxComponent, TimelineComponent, ProgressBarComponent
  - UI: PopoverComponent, ContextMenuComponent, TopBarFilterComponent, ContainerComponent

### Dependency Injection
- All services use `providedIn: 'root'` (singleton, tree-shakeable)
- No need to provide services in module providers

## Important Patterns

### When Creating New Features
1. Follow existing module structure: `components/`, `models/`, `services/`, routing module, feature module
2. Use `DataService` for CRUD operations (handles permissions automatically)
3. Lazy-load via routing
4. Protect routes with `AuthGuardService` if authentication required
5. Use shared components from `SharedModule` where possible
6. Emit state changes via BehaviorSubjects in services

### When Modifying Data Services
- **Always** filter queries by access: `.where('access', 'array-contains', userId)`
- **Always** set access on new documents: creator + all GM users
- Use DataService helper methods for consistent permission handling

### When Working with Firebase
- Use `ApiService` for raw Firebase operations
- Use `DataService` for CRUD with permissions
- Remember: Firestore queries return observables that auto-update on data changes

### Styling
- Component styles use SCSS
- Global styles: `src/scss/styles.scss`
- Tenant-specific styles: `src/scss/{tenant}.scss`
- Tenant body class added for scoped CSS: `.{tenant} .your-selector`

## Testing
- Tests use Jasmine + Karma
- Run in Chrome by default
- Coverage reports: `./coverage/The-Eighth/`
- Test pattern: `*.spec.ts` files alongside source files
