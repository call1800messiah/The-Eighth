# UX Design Guide

This guide defines UX patterns for consistent user experience across features.

---

## Styling Approach

### Responsive Design
- Use mobile-first design principles. Base styles should target mobile devices, with media queries for larger screens.
- Use CSS media queries in SCSS files for responsiveness, using the breakpoints defined in `src/scss/variables.scss`.
- Don't hardcode widths/heights. Use relative units (%, em, rem) and flexbox/grid layouts. If absolutely necessary, use max-width/max-height with CSS variables.

### CSS Variables
Use existing CSS variables for colors, spacing, animations as seen in `src/scss/tde5.scss` and `src/scss/the-eighth.scss`.

* Padding/margin inside most elements: use spacing variable `--item-padding`.
* Margins between elements: use spacing variable `--container-horizontal-padding`.
* Use `--animation-time` for transition durations.

### Forms
All forms should use the global CSS classes defined in src/scss/forms.scss for consistent styling.

* Every form element (input, select, textarea, checkbox, radio) should be wrapped in a `.form-group` div for proper spacing and alignment.
* Every input/select/textarea must have an associated `<label>` for accessibility. The label element always comes after the input element in the HTML structure.
* DO NOT use additional styling on form elements unless absolutely necessary. Rely on the global styles.

Examples:
```html
<!-- Input Field -->
<div class="form-group">
  <input type="text" id="name" formControlName="name" required>
  <label for="name">Name *</label>
</div>

<!-- Text area -->
<div class="form-group">
  <textarea type="text" id="description" formControlName="description" required></textarea>
  <label for="description">Beschreibung *</label>
</div>

<!-- Select Field -->
<div class="form-group">
  <select id="people" formControlName="people" multiple [compareWith]="comparePCs">
    <option [ngValue]="pc" *ngFor="let pc of playerCharacter$ | async">
      {{pc.name}}
    </option>
  </select>
  <label for="people">Charaktere</label>
</div>

<!-- Checkbox -->
<div class="form-group">
  <input type="checkbox" id="active" formControlName="active">
  <label for="active">Aktiv</label>
</div>
```

### Filters
Every filter should use the Top Bar Filter component defined in `src/app/shared/components/top-bar-filter/top-bar-filter.component.ts`.

### Buttons
All buttons should use the global button classes defined in `src/scss/styles.scss` for consistent styling.

* DO NOT create custom button styles unless absolutely necessary. Rely on the global styles.
* Use class `.btn` for any normal button. There is no distinction between primary/secondary buttons.
* Use class `.btn-icon` for icon-only buttons.
* Use class `.btn-text` for text-only buttons. These are typically used in table like lists where a 'cell' is clickable.

---

## Anti-Patterns (DON'T DO)

❌ **Inline styles** - Use SCSS files
❌ **Hardcoded colors** - Use CSS variables
❌ **Fixed widths/heights** - Use relative units and flexbox/grid
