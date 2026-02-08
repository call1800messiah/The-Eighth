# Supabase Migration - Journeys

## Migration Process Flow

```mermaid
flowchart TD
    subgraph Phase1[Phase 1: Setup]
        A1[Install Supabase CLI] --> A2[Init Supabase Project]
        A2 --> A3[Start Local Supabase]
        A3 --> A4[Install JS Client]
    end

    subgraph Phase2[Phase 2: Schema]
        B1[Create Schema SQL] --> B2[Create RLS Policies]
        B2 --> B3[Create Storage Buckets]
        B3 --> B4[Apply Migrations]
        B4 --> B5[Generate TS Types]
    end

    subgraph Phase3[Phase 3: Validate Firebase]
        C1[Check Orphaned Refs] --> C2[Check Circular Deps]
        C2 --> C3[Fix Issues in Firebase]
    end

    subgraph Phase4[Phase 4: Export]
        D1[Export Collections] --> D2[Export Subcollections]
        D2 --> D3[Export Storage Files]
    end

    subgraph Phase5[Phase 5: Transform & Load]
        E1[Create ID Mapping] --> E2[Seed Config Tables]
        E2 --> E3[Migrate Core Entities]
        E3 --> E4[Second Pass: FKs]
        E4 --> E5[Migrate Junction Tables]
        E5 --> E6[Migrate Access Grants]
    end

    subgraph Phase6[Phase 6: Validate]
        F1[Row Counts] --> F2[Referential Integrity]
        F2 --> F3[RLS Policy Tests]
    end

    subgraph Phase7[Phase 7: Refactor Services]
        G1[Core Services] --> G2[Feature Services]
        G2 --> G3[Components]
    end

    subgraph Phase8[Phase 8: Cleanup]
        H1[Remove Firebase Packages] --> H2[Delete Firebase Config]
        H2 --> H3[Update Documentation]
    end

    Phase1 --> Phase2
    Phase2 --> Phase3
    Phase3 --> Phase4
    Phase4 --> Phase5
    Phase5 --> Phase6
    Phase6 --> Phase7
    Phase7 --> Phase8
```

## Data Transformation Flow

### Person Entity Migration

```mermaid
flowchart LR
    subgraph Firebase[Firebase Firestore]
        FP[people collection]
        FI[people/id/info subcollection]
        FA["advantages: Record<ruleId, {level, details}>"]
        FS["skills: Record<ruleId, value>"]
    end

    subgraph Transform[Transformation]
        T1[Generate UUID]
        T2[Map owner to user UUID]
        T3[Extract junction data]
        T4[Extract subcollection data]
    end

    subgraph Supabase[PostgreSQL]
        SP[people table]
        SPA[person_advantages table]
        SPS[person_skills table]
        SIB[info_boxes table]
    end

    FP --> T1 --> SP
    FP --> T2 --> SP
    FA --> T3 --> SPA
    FS --> T3 --> SPS
    FI --> T4 --> SIB
```

### Access Control Migration

```mermaid
flowchart LR
    subgraph Firebase[Firebase]
        FA["access: ['user1', 'user2', 'gm1', 'owner']"]
    end

    subgraph Filter[Filter Logic]
        F1{Is Owner?}
        F2{Is GM?}
        F3[Explicit Grant]
    end

    subgraph Supabase[PostgreSQL]
        SO[owner_id column]
        SR[user_roles table]
        SD[document_access table]
    end

    FA --> F1
    F1 -->|Yes| SO
    F1 -->|No| F2
    F2 -->|Yes| SR
    F2 -->|No| F3
    F3 --> SD
```

## Service Layer Flow

### Before (Firebase)

```mermaid
sequenceDiagram
    participant C as Component
    participant FS as FeatureService
    participant DS as DataService
    participant API as ApiService
    participant FB as Firebase

    C->>FS: getPeople()
    FS->>DS: get(collection, query)
    DS->>API: getDataFromCollection()
    API->>FB: .where('access', 'array-contains', userId)
    FB-->>API: snapshotChanges Observable
    API-->>DS: Observable<docs>
    DS-->>FS: Observable<raw>
    FS->>FS: deserialize + combine
    FS-->>C: Observable<Person[]>
```

### After (Supabase)

```mermaid
sequenceDiagram
    participant C as Component
    participant FS as FeatureService
    participant RT as RealtimeService
    participant SB as Supabase

    C->>FS: getPeople()
    FS->>RT: watchTable('people', query)
    RT->>SB: .from('people').select('*, person_advantages(*)')
    Note over SB: RLS policies filter automatically
    SB-->>RT: {data, error}
    RT->>RT: Set up realtime channel
    RT-->>FS: Observable<Person[]>
    FS->>FS: deserialize (simpler - data already joined)
    FS-->>C: Observable<Person[]>
```

## Authentication Flow

### Before (Firebase Auth)

```mermaid
sequenceDiagram
    participant U as User
    participant A as AuthService
    participant FB as Firebase Auth
    participant FS as Firestore

    U->>A: login(email, password)
    A->>FB: signInWithEmailAndPassword()
    FB-->>A: Firebase User (uid)
    A->>FS: query users where id == uid
    FS-->>A: User data
    A->>A: Merge Firebase User + Firestore User
    A-->>U: AuthUser with isGM
```

### After (Supabase Auth)

```mermaid
sequenceDiagram
    participant U as User
    participant A as AuthService
    participant SA as Supabase Auth
    participant DB as PostgreSQL

    U->>A: login(email, password)
    A->>SA: signInWithPassword()
    SA-->>A: Supabase User (id)
    A->>DB: query users JOIN user_roles
    Note over DB: RLS allows reading own user
    DB-->>A: User data + roles
    A->>A: Compute isGM from roles
    A-->>U: AuthUser with isGM
```

## Real-time Subscription Flow

```mermaid
sequenceDiagram
    participant C as Component
    participant RT as RealtimeService
    participant SB as Supabase
    participant DB as PostgreSQL

    C->>RT: watchTable('people')
    RT->>SB: Initial fetch: .from('people').select()
    SB->>DB: SELECT with RLS
    DB-->>SB: rows
    SB-->>RT: {data}
    RT-->>C: emit(data)

    RT->>SB: Subscribe to channel
    SB->>DB: LISTEN on postgres_changes

    Note over DB: Another user updates a person
    DB-->>SB: Change event
    SB-->>RT: payload
    RT->>SB: Re-fetch: .from('people').select()
    SB-->>RT: {data}
    RT-->>C: emit(updated data)
```

## Storage Migration Flow

```mermaid
flowchart LR
    subgraph Firebase[Firebase Storage]
        FS1[people/balan-cantara.jpg]
        FS2[places/havena.jpg]
        FS3[audio/santana.mp3]
    end

    subgraph Migration[Migration Script]
        M1[Download file]
        M2[Upload to Supabase]
    end

    subgraph Supabase[Supabase Storage]
        SS1[the-eighth/people/balan-cantara.jpg]
        SS2[the-eighth/places/havena.jpg]
        SS3[the-eighth/audio/santana.mp3]
    end

    FS1 --> M1 --> M2 --> SS1
    FS2 --> M1
    FS3 --> M1
    M2 --> SS2
    M2 --> SS3
```

## Entry Points

| Entry Point | Description |
|-------------|-------------|
| `npx supabase start` | Start local Supabase for development |
| `npm run migrate:validate` | Run pre-migration validation (to be created) |
| `npm run migrate:export` | Export Firebase data (to be created) |
| `npm run migrate:transform` | Transform and load data (to be created) |
| `npm run migrate:storage` | Migrate storage files (to be created) |
| `npm run migrate:verify` | Verify migration integrity (to be created) |
