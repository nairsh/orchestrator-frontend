# Design System — Relay Pro Frontend

> Authoritative reference for all visual and behavioral decisions.
> Extended from `.design/DESIGN.md` with additional rules and missing tokens.

---

## A. Brand Character

### What This Product Is

Relay Pro is an AI workflow orchestration platform. The visual language should feel:
- **Professional and precise** — not whimsical or consumer-app soft
- **Dark-first** — the default dark theme is the primary experience
- **Focused and minimal** — no decoration for its own sake
- **Technically honest** — UI reflects actual system state clearly

### What Should Be Preserved

- The warm-dark surface palette (near-black, not pure black)
- Styrene A Web as the display/brand font
- The monochromatic base with green (`accent`) as the only strong chromatic signal
- Compact information density — no excessive whitespace padding

### What Currently Feels Inconsistent or Accidental

- ~~Some hardcoded warm-brown colors in Sidebar (now tokenized)~~ ✅ Fixed
- ~~Voice button in LandingPage not using IconButton~~ ✅ Fixed
- ~~TaskDetail workflow control buttons not using Button component~~ ✅ Fixed
- ~~CommandInput using its own textarea vs. shared Textarea primitive~~ ✅ Fixed
- `paused` status had no design token (used Tailwind `purple-500`) ✅ Fixed

---

## B. Theme Tokens

### Core Colors (CSS Variables)

All CSS variables defined in `src/styles/globals.css`.

#### Surfaces
| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--relay-sidebar` | `#181818` | `#f6f5f2` | Sidebar background |
| `--relay-surface` | `#161616` | `#ffffff` | Default card/page background |
| `--relay-surface-secondary` | `#1b1b1b` | `#f7f7f8` | Muted panels, code blocks |
| `--relay-surface-tertiary` | `#202020` | `#f5f5f5` | Active dropdown items |
| `--relay-surface-warm` | `#111111` | `#faf8f4` | Main page warm background |
| `--relay-surface-hover` | `#242424` | `#f5f5f5` | Hover states |

#### Text
| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--relay-primary` | `#ececec` | `#111111` | Headings, body text |
| `--relay-secondary` | `#bbbbbb` | `#444444` | Supporting text |
| `--relay-muted` | `#959595` | `#666666` | Icons, labels |
| `--relay-placeholder` | `#727272` | `#a0a0a0` | Input placeholders |
| `--relay-subtle` | `#8e8e8e` | `#777777` | Low-emphasis text |

#### Borders
| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--relay-border` | `#303030` | `#e0e0e0` | Default borders |
| `--relay-border-light` | `#3a3a3a` | `#e5e7eb` | Lighter dividers |
| `--relay-border-subtle` | `#262626` | `#f0f0f0` | Very subtle dividers |

#### Semantic
| Token | Value | Usage |
|-------|-------|-------|
| `accent` | `#008040` | Success, positive actions, CTA |
| `info` | `#3B82F6` | Links, information, running state |
| `warning` | `#F59E0B` | Caution, in-progress tool calls |
| `danger` | `#EF4444` | Errors, destructive actions |
| `ink` | `#0a0a0a` | High-contrast filled buttons |

#### Extended Tokens (Added in this session)
| CSS Variable | Dark | Light | Usage |
|-------------|------|-------|-------|
| `--relay-sidebar-accent` | `#a68b6b` | `#8b6b4a` | Sidebar section labels (Starred, Recents) |
| `--relay-avatar-bg` | `#9a7b5b` | `#8b6b4a` | Default avatar background color |
| `--relay-status-paused` | `#9b59b6` | `#7b39a0` | Paused workflow status color |
| `--relay-sidebar-separator` | `#2a2a2a` | `#e8e6e1` | Sidebar horizontal dividers |

### Tailwind Color Classes

```
sidebar, surface, surface-secondary, surface-tertiary, surface-warm, surface-hover
border, border-light, border-subtle
primary, secondary, muted, placeholder, subtle, ink
accent, info, warning, danger
sidebar-accent, avatar-bg, status-paused, sidebar-sep
tasklist (alias), taskitem (alias), promptbg (alias)
```

---

## C. Component Rules

### Buttons

| Use Case | Component | Variant |
|----------|-----------|---------|
| Primary action (submit, save) | `Button` | `primary` |
| Secondary action (cancel, back) | `Button` | `secondary` |
| Tertiary/text action | `Button` | `ghost` |
| Destructive action (delete) | `Button` | `danger` |
| Icon-only action | `IconButton` | default or `filled` |
| Filled send button | `IconButton` | `filled` |

**Never use raw `<button>` for:**
- Actions in modals (use `Button`)
- Form submit/cancel buttons (use `Button`)
- Icon-only controls (use `IconButton`)
- The send button in any input (use `IconButton` filled)

**Raw `<button>` is acceptable for:**
- Sidebar nav items (custom active-state layout)
- List items that act as large click targets
- Toggle controls that extend the `Toggle` component

### Form Fields

| Use Case | Component |
|----------|-----------|
| Single-line text input | `Input` |
| Multi-line auto-growing | `Textarea` |
| Search with icon + clear | `SearchInput` |

### Search Bars

All search inputs across the product should use `SearchInput`. The pattern includes:
- A search icon on the left
- An auto-focused text input
- A clear button (×) on the right when value is non-empty
- Escape key handler to clear + dismiss

### Dropdowns

All dropdown/popover menus use `DropdownMenu` + `DropdownMenuItem` + `DropdownMenuDivider`. Direct implementation using raw `div` + click-outside is acceptable only when the layout requirements prevent use of `DropdownMenu`.

### Cards / Surfaces

```
Card (padding=md)    — default interactive surface
Card (padding=lg)    — spacious content area
bg-surface           — page background
bg-surface-secondary — muted panel/background
bg-surface-tertiary  — nested UI element
bg-surface-warm      — main app background (warmly tinted)
```

### Modals / Drawers

All dialogs use `Modal` + `ModalHeader` + `ModalBody` + `ModalFooter`. Escape closes. Backdrop click closes. Enter/exit scale animation (150ms).

### Tabs

Currently no `Tabs` component. Inline section switching uses nav button patterns. If tabs are needed in more than 2 places, extract a `Tabs` component.

### Loading States

| Pattern | When To Use |
|---------|-------------|
| `Skeleton` / `SkeletonText` | Page-level loading placeholders |
| `SkeletonTaskItem` | Task list loading |
| `SkeletonFeedItem` | Feed loading |
| `Loader2 animate-spin` | Inline loading (small, auth screens) |
| `animate-pulse` dot | Polling indicator (subtle, secondary) |
| `shimmer-text` | AI thinking indicator text |

### Empty States

**Pattern (required elements):**
1. Icon or symbol (⚡, ✨, 📄)
2. Short heading text (`text-placeholder`)
3. Optional hint text (`text-placeholder/70`)
4. Optional action button

**Forbidden:** Just dropping two lines of gray text without visual context. All empty states must have at minimum an icon + heading.

### Error States

Use `danger` color token. Pattern:
- Icon (AlertCircle or similar)
- Error message in `text-danger`
- Optional retry action button (Button variant=secondary)

### Status Indicators

Use `StatusDot` component:
```tsx
<StatusDot status="executing" />
<StatusDot status="completed" />
```

Maps to: pending=placeholder, executing=warning+pulse, completed=muted, failed=danger, cancelled=placeholder, paused=status-paused.

---

## D. Layout Rules

### Page Structure

```
<div className="flex h-full app-ui bg-surface-warm">
  <Sidebar ... />
  <main className="flex-1 flex flex-col min-w-0">
    { page content }
  </main>
</div>
```

### Content Width

| Context | Max Width |
|---------|-----------|
| Chat/detail feed | `max-w-chat` (760px) or `maxWidth={760}` |
| Form inputs/content | `max-w-content` (600px) or `maxWidth={600}` |
| Landing input box | `w-[640px] max-w-[calc(100vw-120px)]` |

### Section Spacing

- Modal body: `px-5 py-5`
- Modal header: `px-5 py-4`
- Page section padding: `p-6`
- Compact header: `h-12 px-6`

### Sidebar

- Expanded width: 240px
- Collapsed width: 44px
- Background: `bg-sidebar`
- Separator: `bg-sidebar-sep`

### Scroll Regions

All scrollable areas use `overflow-y-auto` with `.hide-scrollbar` class. Scrollbars are styled to 4px width via global CSS.

### Responsive Breakpoints

- `md` (768px): Sidebar hidden with `.sidebar-desktop-only`
- Mobile: `.mobile-stack` for column flex layout
- No other breakpoints currently defined.

---

## E. Usage Constraints (Forbidden)

- ❌ Hardcoded hex colors in component files (use CSS variable classes)
- ❌ Raw font-family strings in style attributes (use font-sans, font-display, font-mono)
- ❌ Arbitrary padding/margin values outside the Tailwind scale
- ❌ Duplicate components with overlapping purpose (e.g., two kinds of text input)
- ❌ `style={{ fontFamily: '...' }}` — use font-sans / font-display classes
- ❌ Inline `style={{ backgroundColor: '#...' }}` — add token to tailwind.config.js first
- ❌ `text-gray-*`, `bg-gray-*`, `text-white`, `bg-white` in UI components — use `text-primary`, `bg-surface`, etc.
- ❌ `border-gray-*` — use `border-border`, `border-border-light`, `border-border-subtle`

### Intentional Exceptions (documented)

- `BashBlock.tsx`: `bg-gray-950`, `text-gray-300`, `border-gray-800` — terminal aesthetic, intentional
- `TaskGroupBlock.tsx`: `text-green-600`, `text-red-500`, `text-blue-500` — semantic status colors
- `PlanningBlock.tsx`: `bg-gray-400` — neutral loading dots
- Tool block status: `bg-amber-500`, `bg-green-500`, etc. — intentional accent colors

---

## F. Motion Conventions

| Purpose | Duration | Easing |
|---------|----------|--------|
| Button hover state | 150ms | ease |
| Dropdown open/close | 100ms | ease |
| Modal enter/exit | 150ms | ease-out |
| Sidebar collapse | 200ms | ease |
| Skeleton shimmer | 1.5s | ease-in-out infinite |
| Thinking shimmer | 1.45s | ease-in-out infinite |

All animations respect `prefers-reduced-motion: reduce`.

---

## G. Z-Index Layering

| Layer | z-index | Usage |
|-------|---------|-------|
| Dropdown menus | `z-50` | All dropdowns, context menus |
| Modal backdrop | `z-50` | Full-screen overlay |
| Tooltip hints | `z-50` | Sidebar collapsed tooltips |
| Notifications | `z-[60]` | Toast notifications (via sileo) |
