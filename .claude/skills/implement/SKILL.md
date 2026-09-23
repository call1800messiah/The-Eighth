---
name: implement
description: Implement and refactor code to match UI/UX flow diagrams (full stack)
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Task
  - Bash(npm run build:*)
  - Bash(npm test:*)
  - Bash(npx nx build:*)
  - Bash(npx nx test:*)
  - Bash(npx nx lint:*)
  - Bash(npx tsc:*)
  - Bash(npx vitest:*)
  - Bash(npx nx run global-schema-shared:generate-schema)
  - Bash(git status:*)
  - Bash(git diff:*)
  - Bash(git log:*)
  - WebFetch
---

# Implementation Skill

## Purpose
Implement code following the planned architecture:
- Read Bill of Materials (BOM) from description.md
- Follow interface designs
- Implement tests per test-plan.md

**IMPORTANT**: Read planning docs first. Follow existing patterns.

## Modes

### Standalone Mode
Invoked directly: `/implement "task description"`

### Feature Mode (PREFERRED)
Called by `/feature` skill during Phase 5:

```
/implement docs/features/{feature-name}/
```

**REQUIRES**: Path to feature folder with completed architecture and TODO checklist in todos.md.

## Workflow

### Feature Mode Workflow (when called by /feature)

1. **Read feature folder** (provided as argument)
   - Read `todos.md` for TODO checklist
   - Read `description.md` for source locations
   - Read `journey.md` for architecture and UI/UX wireframes

2. **Verify prerequisites**:
   - journey.md contains **approved UI/UX wireframes**
   - journey.md contains architecture diagrams
   - todos.md has `## Active TODOs` section with checkboxes

3. **Follow the TODO checklist**:
   - Read `## Active TODOs` section in todos.md
   - Work through items IN ORDER
   - After completing each item:
     - Update todos.md to check off `[x]` the item
     - Update `**Status**:` to "In Progress"
   - When all items done, set status to "Complete"

4. **If user requests changes**:
   - STOP current work
   - Update todos.md with the change
   - Add/modify TODO items if needed
   - Continue implementation

5. **Verify each layer** before moving to next

6. **Run full verification**: build, lint, test

### TODO Checklist Rules (CRITICAL)

**MUST follow these rules:**
- Never skip TODO items
- Never work on items out of order (unless dependencies require it)
- Always update todos.md after completing an item
- If blocked on an item, note it in todos.md and ask user
- User changes = update todos.md FIRST, then continue

### TODO Item Format

Each TODO item is self-contained with all info needed:

```markdown
- [ ] **TODO-XXX**: {Action} | File: `{path}` | Depends: {TODO-YYY or none}
  - What: {detailed description}
  - Why: {purpose}
  - How: {implementation details}
  - Accept: {acceptance criteria}
```

## Full Stack Scope

| Layer             | Location                                        |
|-------------------|-------------------------------------------------|
| Routes            | `src/app/{feature}/{feature}-routing-module.ts` |
| Features          | `src/app/{feature}`                             |
| Shared Components | `src/app/shared/components`                     |
| Shared Directives | `src/app/shared/directives`                     |

## Verification Commands

```bash
# Build
npm run build

# Lint
npm run lint

# Tests
npm run test
```

---

## Implementation Standards

**CRITICAL: Follow Approved UI/UX Wireframes**

Before implementing any frontend code, verify against journey.md:
- **Field visibility**: Only show fields confirmed in UI/UX review
- **Loading behavior**: Use approved pattern (eager/lazy) for relations
- **URL architecture**: Implement confirmed URL params
- **Component split**: Follow planned split (one component per file, ~150 lines max)

---

### 3. Quality Verification
See "Quality Verification" section below.

---

## Verification Sequence

```bash
# 1. Build
npm run build
```

**Run after each layer**, not just at the end.

---

## Code Style Check (MANDATORY - BLOCKING)

After completing implementation, run codestyle check:

```
/codestyle --integration {implemented-files-or-folder}
```

### What Gets Checked
- Naming conventions (files, components, types)
- Import order and patterns

### Severity Levels

| Level | Action                      |
|-------|-----------------------------|
| **CRITICAL** | MUST fix before continuing  |
| **ERROR** | Should fix before merge     |
| **WARNING** | Advisory, can proceed       |

---

## Quality Verification (MANDATORY - BLOCKING)

Before marking feature complete, verify ALL quality standards.

### Pre-Completion Checklist

1. **Read** `.claude/skills/QUALITY-STANDARDS.md`
2. **Check EVERY item** below:

### UI Checklist
- [ ] Implementation matches approved wireframes in journey.md
- [ ] Only approved fields are displayed (no extras)
- [ ] URL architecture matches plan
- [ ] Component split follows plan (one per file, ~150 lines)
- [ ] No component duplication (check shared first)
- [ ] **Styling uses SCSS files** (NO inline styles)
- [ ] CSS variables used for colors (NO hardcoded values)
- [ ] Responsive design with CSS media queries

---

## Completion Rules

### When to Mark Complete

Feature is complete ONLY when:
1. ✅ All TODO items checked off
2. ✅ Quality verification checklist complete
3. ✅ Build passes

### When to BLOCK Completion

**DO NOT mark complete if:**
- ❌ Quality checklist has unchecked items
- ❌ Build fails

If blocked, continue implementation until all items pass.

---
