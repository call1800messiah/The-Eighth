# Quality Standards Checklist

All skills MUST reference this checklist before marking work complete.

---

## UI Standards (MANDATORY)

### Component Reuse
- [ ] Check `src/app/shared/components` for existing components BEFORE creating new
- [ ] Check `src/app/shared/directives` for existing directives BEFORE creating new
- [ ] Check `src/app/shared/pipes` for existing pipes BEFORE creating new
- [ ] New reusable components go in shared, not feature-specific

### New Component Structure
When creating a new component:
```
component-name/
├── component-name.component.html
├── component-name.component.scss
├── component-name.component.spec.ts
└── component-name.component.ts
```

### Page Layout Patterns
- [ ] Pages with parent: Include Breadcrumbs above header
- [ ] Forms use existing Form component patterns

### Responsive Design
- [ ] Mobile-first: base styles are mobile, breakpoints add desktop
- [ ] Use CSS media queries in SCSS modules

---

## UX Standards (MANDATORY)

See `.claude/skills/UX-DESIGN-GUIDE.md` for detailed patterns.

### Accessibility
- [ ] Semantic HTML (`button`, `nav`, `main`, `article`)
- [ ] ARIA labels on icon-only buttons
- [ ] Keyboard navigation works

---

## Observability (MANDATORY)

### Logging
- [ ] Errors logged with context (userId, action, params)
- [ ] No sensitive data in logs (passwords, tokens)

---

## Testing (MANDATORY - BLOCKING)

Implementation CANNOT be marked complete until:

- [ ] Unit tests written for components/directives/pipes (target: 80%)
- [ ] Critical paths have E2E coverage
- [ ] Tests actually PASS: `npx nx test {project}`

**If tests fail, you MUST fix them before marking complete.**

---

## Documentation Hygiene (MANDATORY)

Feature docs in `docs/features/{feature}/` impact context size. Keep them lean.

### Scratchpad.md (max 50 lines)
- [ ] Only contains ACTIVE items (open questions, current blockers)
- [ ] Resolved items deleted (not archived)
- [ ] Finalized decisions moved to description.md
- [ ] No routine progress notes (use todos.md checkboxes)

### All Feature Docs
- [ ] No redundant information across files
- [ ] Completed phases → summarize, don't keep verbose notes
- [ ] Delete examples/templates after implementation
- [ ] Each file serves ONE purpose (don't duplicate)

---

## Quick Reference: Existing Components

Check these BEFORE creating new:

| Component           | Location                                                  | Use For                                       |
|---------------------|-----------------------------------------------------------|-----------------------------------------------|
| `Access indicator`  | `src/app/shared/components/access-indicator`              | Button to indicate and manage per item access |
| `Avatar`            | `src/app/shared/components/avatar`                        | Person image representation                   |
| `Box grid`          | `src/app/shared/components/box-grid`                      | Box elements layed out in a grid              |
| `Container`         | `src/app/shared/components/container`                     | Wrapping any content to constrain the width   |
| `Dashboard`         | `src/app/shared/components/dashboard`                     | Router outlet for module start component      |
| `Info box`          | `src/app/shared/components/info-box`                      | Displaying any info element                   |
| `Top bar filter`    | `src/app/shared/components/top-bar-filter`                | Any list that needs to be filtered            |

---

## Quick Reference: Shared Pipes

| Hook            | Location                                     | Use For                       |
|-----------------|----------------------------------------------|-------------------------------|
| `estimated age` | `src/app/shared/pipes/estimated-age.pipe.ts` | Showing rounded age of people |
