---
name: test
description: General-purpose testing for all test types - unit, integration, E2E, component tests
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Task
  - AskUserQuestion
  - Bash(npx vitest:*)
  - Bash(npx cypress:*)
  - Bash(npm test:*)
  - Bash(npx nx test:*)
  - Bash(npx nx e2e:*)
  - Bash(npx nx run:*:test)
  - Bash(git status:*)
  - Bash(git diff:*)
  - Bash(git log:*)
  - WebFetch
---

# Testing Skill

## Purpose
General-purpose testing skill for ALL test types:
- Unit tests (hooks, utils, services)
- Integration tests (API, GraphQL resolvers)
- Component tests (UI components)
- E2E tests (user journeys)

## Modes

### Execution Mode (default)
Run tests, debug failures, write test code.

Invoked: `/test` or `/test path/to/file.spec.ts`

### Planning Mode
Create test plan BEFORE implementation. Used by `/feature` skill.

Invoked: `/test --plan docs/features/{feature}/`

**REQUIRES**: Path to feature folder with approved architecture in journey.md.

## Test Frameworks

| Framework  | Purpose                |
|------------|------------------------|
| Karma      | Unit/Integration tests |
| Protractor | E2E tests              |

## Workflows

### General Testing
1. **Read source code**: Understand what needs testing
2. **Check existing tests**: Find related test files
3. **Create/update tests**: Write tests following patterns
4. **Run tests**: Verify they pass
5. **Debug failures**: Analyze and fix failing tests

### Flow-Based Testing (when using UI/UX flows)
1. **Read flows**: Extract `T-{FEAT}-*` markers from diagrams
2. **Map to scenarios**: Understand what each marker validates
3. **Generate tests**: Create tests matching markers
4. **Update test-plan.md**: Document coverage

## Test File Locations

| Type             | Location                             | Naming      |
|------------------|--------------------------------------|-------------|
| Unit             | Next to source                       | `*.spec.ts` |
| E2E (Protractor) | `e2e/src/`                           | `*.po.ts`   |

## Test ID Convention (for flow-based tests)

| Format | Type | Example |
|--------|------|---------|
| `T-{FEAT}-{NUM}` | Standard test | T-TREE-001 |
| `T-{FEAT}-S{NUM}` | State machine | T-TREE-S01 |
| `T-{FEAT}-E{NUM}` | Edge case | T-TREE-E01 |
| `T-{FEAT}-I{NUM}` | Integration | T-TREE-I01 |

## Checklist

When writing tests:

1. [ ] Identify what needs testing
2. [ ] Check existing test patterns in codebase
3. [ ] Create test file next to source
4. [ ] Write tests following project conventions
5. [ ] Run tests locally to verify
6. [ ] Check coverage if applicable

---

## Planning Mode

### When to Use
- Before implementing a new feature
- Called by `/feature` skill in Phase 4
- When you need to document test strategy first

### Required Input

**Planning mode REQUIRES a feature folder path as argument.**

```
/test --plan docs/features/{feature}/
```

If no folder path provided, STOP and ask for it.

### Prerequisites (MANDATORY)

**Before creating test plan, READ the feature folder and verify:**

1. ✅ Folder exists with description.md and journey.md
2. ✅ journey.md contains flow diagrams or state machines
3. ✅ description.md contains "## Key Components" with source locations
4. ✅ Architecture is approved (check for Mermaid diagrams in journey.md)

**If ANY of these are missing:**
- DO NOT proceed with test planning
- Return error: "Architecture not complete. Please finish /architect phase first."

### Planning Workflow

1. **Read feature folder**: Parse description.md and journey.md
2. **Verify architecture exists**: Check for required sections
3. **Extract testable units from description.md**:
   - Utilities
   - Services
   - Components
   - User journeys (from journey.md)
4. **Choose test types** per component
5. **Assign test IDs** (T-{FEAT}-{NUM})
6. **Set coverage targets**
7. **Output**: Update `docs/features/{feature}/test-plan.md`

### Planning Output Structure

```markdown
# {Feature} Test Plan

## Overview
{Brief description of what's being tested}

## Test Strategy

### Unit Tests
| Component | File | Coverage Target |
|-----------|------|-----------------|
| useFeature | use-feature.spec.ts | 80% |

### Integration Tests
| Component | File | Coverage Target |
|-----------|------|-----------------|
| FeatureResolver | feature-resolver.spec.ts | 70% |

### E2E Tests
| Flow | File | Framework |
|------|------|-----------|
| Complete feature flow | feature.po.ts | Protractor |

## Test Cases

### Unit: useFeature Hook
| ID | Scenario | Expected |
|----|----------|----------|
| T-FEAT-001 | Happy path | Returns data |
| T-FEAT-002 | Error handling | Shows error toast |

### Integration: FeatureResolver
| ID | Scenario | Expected |
|----|----------|----------|
| T-FEAT-I01 | Create entity | Returns new entity |

### E2E: User Journey
| ID | Scenario | Steps |
|----|----------|-------|
| T-FEAT-E01 | Full flow | Navigate → Fill → Submit → Verify |
```

---

## Test ID Naming

### Format
`T-{FEATURE}-{TYPE}{NUMBER}`

### Prefixes
| Prefix | Type |
|--------|------|
| (none) | Unit test |
| I | Integration |
| E | E2E |
| S | State machine |

### Examples
- `T-TREE-001` - Tree unit test
- `T-TREE-I01` - Tree integration test
- `T-TREE-E01` - Tree E2E test
