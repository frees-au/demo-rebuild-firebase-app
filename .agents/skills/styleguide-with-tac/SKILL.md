# AC CSS Methodology — Rules & Guidelines

This skill adapts the tag-first CSS methodology for AC Pontify. The app uses clean native HTML, `ac-` custom tags, attributes, and vanilla CSS. It does not use Tailwind, `@apply`, component utility classes, or framework-specific class systems.

The goal is readable markup where the component name is visible:

```html
<button>
<details>
<ac-badge>
<ac-accordion>
```

Avoid obscuring components behind classes and boilerplate:

```html
<button class="btn">
<details class="collapse">
<div class="badge">
<div id="faq-list" class="foo-bar accordion baz">
```

## Core Philosophy

- The web platform is the framework: HTML, CSS, and JavaScript.
- Components should be meaningful elements, not `div` soup with classes.
- Prefer CSS over JavaScript. Add JavaScript only when CSS or native HTML cannot do the job.
- Styling must be vanilla CSS that works in the browser without Tailwind or build-time CSS transforms.
- The interface should be easy to adjust through `--ac-` variables, not rewritten component CSS.

## Standard 1 — Tag First

Style the element by its HTML tag before doing anything else.

```css
button { ... }
details { ... }

ac-alert { ... }
ac-card { ... }
```

- Prefer native HTML tags wherever they fit: `button`, `details`, `summary`, `dialog`, `nav`, `main`, `section`, `article`, `form`, `table`, headings, lists, and text elements.
- Custom tags must use the `ac-` namespace prefix.
- The tag name should be a clear noun that describes the component: `ac-alert`, `ac-card`, `ac-badge`, `ac-panel`.
- Structural children may also use custom tags when they clarify markup: `ac-card-title`, `ac-shell-sidebar`, `ac-brand-mark`.
- Do not create subtype tags for component variations. Use the base component tag with a `variant` attribute instead: `<ac-card variant="login">`, not `<ac-login-card>` or `<ac-card-login>`.
- Never use `div` or `span` as the public component identity when a native tag or `ac-` custom tag would be clearer.
- Every custom tag must either wrap native semantics or declare the needed `role` and `aria-*` attributes in markup.

## Standard 2 — Attributes Second

Use HTML attributes to define variants, states, and customization.

```html
<button variant="primary">
<ac-card variant="login">
<ac-badge status="ready">
<ac-panel emphasis="alert">
<details open>
```

```css
button[variant="primary"] { ... }
ac-card[variant="login"] { ... }
ac-badge[status="ready"] { ... }
ac-panel[emphasis="alert"] { ... }
details[open] summary::after { ... }
```

- Use attributes for variants and states, not extra classes.
- A component subtype is a `variant` on the base tag. For example, use `<ac-panel variant="settings">`, `<ac-grid variant="color">`, or `<ac-card variant="login">` instead of inventing `ac-settings-panel`, `ac-color-grid`, or `ac-login-card`.
- Prefer existing HTML attributes: `disabled`, `hidden`, `open`, `type`, `aria-current`, `aria-invalid`.
- Use boolean attributes for simple on/off states.
- Use lowercase, hyphenated value attributes for named variants: `status="ready"`, `surface="hard"`, `layout="split"`.
- Attribute-based variants are the component API. Keep them stable and intentional.
- If a state is not native, pair the visual attribute with an ARIA state.

## Standard 3 — Classes Last

Classes are the escape hatch, not the styling mechanism.

- Never use a class to create a component: use a native tag or `ac-` tag.
- Never use a class for a component variant: use an attribute.
- Never use a class for spacing, layout, colors, or typography.
- Do not carry in Tailwind utilities, BEM names, Bootstrap-style names, or framework classes.
- A class is acceptable only when Svelte or a third-party API requires it and a tag or attribute cannot express the hook.

## Standard 4 — Design Tokens Are Mandatory

All style-guide values must be CSS custom properties prefixed with `--ac-`.

Global tokens live in `src/app.css` on `:root`.

```css
:root {
  --ac-color-paper: #f4f1ea;
  --ac-color-paper-hard: #fffdf7;
  --ac-color-ink: #090909;
  --ac-color-ink-soft: #33302c;
  --ac-color-line: #090909;
  --ac-color-red: #7f1111;
  --ac-color-red-dark: #4c0909;
  --ac-color-red-wash: #ead6d1;
  --ac-color-steel: #c9c2b8;

  --ac-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --ac-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --ac-space: 0.25rem;
  --ac-border-width: 2px;
  --ac-radius: 0;

  --ac-focus-ring-color: var(--ac-color-red);
  --ac-focus-ring-width: 4px;
  --ac-focus-ring-offset: 2px;

  --ac-duration-fast: 150ms;
  --ac-duration: 260ms;
  --ac-duration-slow: 500ms;
  --ac-ease: ease-out;
}
```

Component-scoped tokens are declared on the component tag and named `--ac-[component]-[property]`.

```css
ac-badge {
  --ac-badge-background: var(--ac-color-steel);
  --ac-badge-color: var(--ac-color-paper-hard);
  --ac-badge-border-color: var(--ac-color-line);

  background: var(--ac-badge-background);
  color: var(--ac-badge-color);
  border: var(--ac-border-width) solid var(--ac-badge-border-color);
}

ac-badge[status="ready"] {
  --ac-badge-background: var(--ac-color-red);
}
```

- Never hard-code a design value in a component when a token exists.
- Global tokens use `--ac-[category]-[variant]`: `--ac-color-red`, `--ac-font-sans`.
- Component tokens use `--ac-[component]-[property]`: `--ac-badge-background`.
- Component tokens should reference global tokens.
- Do not redeclare global tokens on component tags. Define component-scoped tokens that consume them.
- Durations, focus rings, borders, spacing, and typography are design values too.

## Standard 5 — JavaScript Behavior

Start with native behavior and CSS.

- Use native controls first: `button`, `details`, `summary`, `dialog`, inputs, selects, and forms.
- JavaScript should enhance behavior, not replace styling logic.
- Toggle attributes and let CSS respond.
- Do not write inline styles for component state.
- Do not use JavaScript to recreate platform behavior that already exists.

## Standard 6 — Selector Discipline

Keep selectors simple, flat, and grounded in the tag.

```css
ac-card { ... }
ac-card[variant="outlined"] { ... }
ac-card header { ... }
```

Avoid fragile class chains:

```css
.card-wrapper > div.card.elevated span.title { ... }
```

- Selectors should almost always start with a native tag or `ac-` component tag.
- Use `:where()` for broad base styles when low specificity helps.
- Avoid ID selectors in styles.
- Avoid `!important`.
- Keep nesting shallow.

## Standard 7 — File And Scope Organization

`src/app.css` is the style-guide entry point.

Recommended structure inside `src/app.css`:

```css
@layer reset, base, components, pages;

@layer reset {
  * { box-sizing: border-box; }
}

@layer base {
  :root { ... }
  body { ... }
  button { ... }
  details { ... }
}

@layer components {
  ac-panel { ... }
  ac-badge { ... }
  ac-shell { ... }
}
```

- Base styles for native HTML elements belong in the `base` layer.
- Shared custom tags belong in the `components` layer.
- Page-specific styles may live in a Svelte `<style>` block when they are truly local.
- Do not use Tailwind `@theme`, `@apply`, or utility class composition.
- Do not invent a class naming system for components.

## Standard 8 — Naming Conventions

| Thing | Convention | Example |
| --- | --- | --- |
| Custom tag | `ac-[noun]` | `ac-alert`, `ac-card`, `ac-badge` |
| Structural child tag | `ac-[component]-[part]` | `ac-card-title`, `ac-shell-sidebar` |
| Component subtype | base tag plus `variant` | `<ac-card variant="login">` |
| Boolean attribute | lowercase noun/adjective | `disabled`, `open`, `compact` |
| Value attribute | lowercase, hyphenated | `status="ready"`, `variant="primary"` |
| Global design token | `--ac-[category]-[variant]` | `--ac-color-red`, `--ac-font-sans` |
| Component token | `--ac-[component]-[property]` | `--ac-badge-background` |

## Standard 9 — Accessibility Is A Standard

Tag-first markup supports accessibility because native elements bring keyboard behavior, roles, names, and platform conventions.

- Prefer native elements because they already carry semantics.
- A custom `ac-` tag must not hide semantics. Add `role` and `aria-*` where needed.
- A state attribute must either be native or paired with ARIA.
- Never signal state with color alone. Pair color with text, shape, or iconography.
- Focus styles come from shared `--ac-focus-*` tokens.
- Keyboard navigation must work without custom scripts.
- Do not use positive `tabindex`.
- Reading order should remain DOM order.

## Quick Reference Checklist

1. Is there a native HTML tag for this? Use it.
2. If no native tag fits, is the custom tag named with `ac-`?
3. Are variants and states attributes rather than classes?
4. Is state visible to assistive technology?
5. Are all style values using `--ac-` tokens?
6. Is the CSS vanilla, with no Tailwind or `@apply`?
7. Are selectors simple and tag-first?
8. Can the component be reached and operated by keyboard?

## Anti-Patterns To Avoid

| Anti-pattern | Why | Use instead |
| --- | --- | --- |
| `<div class="alert">` | Meaningless element | `<ac-alert>` |
| `<button class="btn">` | Component hidden behind class | `<button variant="primary">` |
| `<div class="badge">Ready</div>` | Component hidden behind class | `<ac-badge status="ready">Ready</ac-badge>` |
| `<ac-login-card>` | Subtype split into a new tag | `<ac-card variant="login">` |
| `<ac-card-login>` | Subtype split into a new tag | `<ac-card variant="login">` |
| `<div class="accordion">` | Rebuilds native behavior | `<details>` or `<ac-accordion>` wrapping `<details>` |
| Tailwind utilities in markup | Obscures component intent | Tags, attributes, and vanilla CSS |
| `@apply` | Build-time CSS dependency | Plain CSS declarations |
| `.card.card--dark.card--elevated` | Class soup | `<ac-card theme="dark" elevated>` |
| Inline styles toggled by JavaScript | Bypasses CSS contract | Toggle attributes |
| Hard-coded color values in components | Breaks the style guide | `var(--ac-color-...)` |
| Hard-coded spacing values in components | Duplicates spacing logic | `calc(var(--ac-space) * n)` |

This methodology is adapted for AC Pontify from the tag-first CSS approach described in the source article, using `ac-` custom tags, `--ac-` variables, Svelte markup, and vanilla CSS.
