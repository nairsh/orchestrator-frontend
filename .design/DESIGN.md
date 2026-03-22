# Design System — Relay Pro Frontend

> This document is the single source of truth for design decisions, token values,
> component APIs, and conventions. A new engineer or AI agent should be able to
> continue the system 1:1 using only this file.

---

## 1. Stack

| Layer | Tool |
|-------|------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS (config-driven tokens) |
| Icons | `lucide-react` (consistent `size`, `strokeWidth` props) |
| Fonts | Inter (body/UI), Styrene A Web (display/sidebar) |

---

## 2. Color Tokens

Defined in `tailwind.config.js > theme.extend.colors`.

### Surfaces

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#161616` | Default card/page background |
| `surface-secondary` | `#1B1B1B` | Muted panels, code blocks, table headers |
| `surface-tertiary` | `#202020` | Active dropdown items, message bubbles |
| `surface-warm` | `#111111` | Chat message areas, warm backgrounds |
| `surface-hover` | `#242424` | Hover state for interactive elements |
| `sidebar` | `#181818` | Sidebar background |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#ECECEC` | Headings, body text, active states |
| `secondary` | `#BBBBBB` | Supporting text, descriptions |
| `muted` | `#959595` | Icons, labels, metadata |
| `placeholder` | `#727272` | Input placeholders |
| `subtle` | `#8E8E8E` | Model labels, low-emphasis text |

### Borders

| Token | Value | Usage |
|-------|-------|-------|
| `border` | `#303030` | Default borders (cards, inputs, dropdowns) |
| `border-light` | `#3A3A3A` | Lighter borders (modal dividers, tables) |
| `border-subtle` | `#262626` | Dividers inside dropdowns |

### Semantic

| Token | Value | Usage |
|-------|-------|-------|
| `accent` | `#008040` | Success, positive actions |
| `info` | `#3B82F6` | Links, informational states |
| `warning` | `#F59E0B` | Tool call indicators |
| `danger` | `#EF4444` | Errors, destructive actions |
| `ink` | `#0A0A0A` | High-contrast filled actions (send buttons, active pills) |

---

## 3. Typography

### Font Families (Tailwind classes)

| Class | Stack | Usage |
|-------|-------|-------|
| `font-sans` | Inter, system stack | Body text, inputs, buttons |
| `font-display` | Styrene A Web, Inter | Sidebar labels, display text |
| `font-ui-secondary` | Styrene B Thin Trial, Inter | Small utility UI labels in compact menus/dropdowns |
| `font-mono` | ui-monospace, SFMono-Regular, Menlo... | Code blocks |

### Font Sizes (Tailwind classes)

| Class | Size / Line Height | Usage |
|-------|-------------------|-------|
| `text-2xs` | 10px / 14px | Badges, fine print |
| `text-xs` | 12px / 16px | Labels, credits, metadata |
| `text-sm` | 13px / 18px | Dropdown items, small text |
| `text-base` | 14px / 20px | Nav items, form labels |
| `text-md` | 15px / 22px | Input text, model labels |
| `text-lg` | 18px / 26px | Section headers |
| `text-xl` | 22px / 30px | Logo text |

### Font Stacks for UI Contexts

| CSS Class | Usage |
|-----------|-------|
| `.app-ui` | Sidebar, tasks page — uses `font-display` |
| `.chat-ui` | Chat modals and full page — uses `font-sans` |
| `.md` | Markdown rendered content — Inter, 15px |

**Secondary font guidance:**
- Use `font-ui-secondary` for compact UI controls where a lighter, narrower tone improves hierarchy (for example profile dropdown menu items).
- Keep `font-sans` as the default for readability-heavy content and form inputs.

---

## 4. Spacing

Uses Tailwind's default scale plus custom additions:

| Token | Value | Common Usage |
|-------|-------|-------------|
| `4.5` | 18px | Bubble padding |
| `13` | 52px | — |
| `15` | 60px | — |
| `18` | 72px | — |

**Spacing conventions:**
- Component padding: `p-3` (12px) for cards, `p-4` (16px) for page sections, `p-5` (20px) for modals
- Gap between items: `gap-1` (4px) for nav items, `gap-2` (8px) for form elements, `gap-3` (12px) for sections
- Page horizontal padding: `px-5` for modal headers, `px-16` for input wrappers

---

## 5. Border Radius

| Class | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 6px | Sidebar buttons, subtle elements |
| `rounded` / `rounded-md` | 8px | Default (buttons, inputs, dropdowns) |
| `rounded-lg` | 12px | Cards, code blocks, tool call items |
| `rounded-xl` | 16px | Input cards, modal body |
| `rounded-2xl` | 18px | Message bubbles |
| `rounded-pill` | 9999px | Toggle knobs, pills, send buttons |

---

## 6. Shadows

| Class | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.18)` | New task button, sidebar items |
| `shadow-sm` | `0 2px 4px rgba(0,0,0,0.20)` | Toggle knobs |
| `shadow` | `0 2px 8px rgba(0,0,0,0.22)` | Cards, input containers |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.28)` | Elevated cards |
| `shadow-dropdown` | `0 10px 32px rgba(0,0,0,0.45)` | All dropdown menus |
| `shadow-modal` | `0 20px 64px rgba(0,0,0,0.50)` | Modal overlays |

---

## 7. Animations

| Class | Keyframes | Usage |
|-------|-----------|-------|
| `animate-fade-in` | opacity 0→1, 150ms | General fade entrances |
| `animate-slide-up` | translateY(4px)→0, 100ms | Dropdown menus (downward) |
| `animate-slide-down` | translateY(-4px)→0, 100ms | Dropdown menus (upward) |
| `animate-scale-in` | scale(0.98)+translateY(8px)→1, 150ms | Modal entrance |

**Transition durations:**
- `duration-fast`: 100ms (dropdown animations)
- `duration-DEFAULT`: 150ms (button states, modal enter/exit)
- `duration-slow`: 200ms (sidebar collapse, chevron rotation)

---

## 8. Shared Hooks

### `useClickOutside(ref, handler, enabled?)`

**File:** `src/hooks/useClickOutside.ts`

Replaces the duplicated `document.addEventListener('mousedown', …)` pattern.
Used by all dropdowns and context menus.

### `useEscapeKey(handler, enabled?)`

**File:** `src/hooks/useEscapeKey.ts`

Replaces the duplicated Escape key listener pattern. Used by all modals
and chat views.

### `useChatStream({ config, model })`

**File:** `src/hooks/useChatStream.ts`

Encapsulates the entire SSE streaming flow (send message, accumulate text
deltas, handle done/error). Returns `{ messages, streaming, draftAssistant,
canSend, send, abort }`. Used by `ChatModal` and `FullPageChat`.

---

## 9. UI Primitives (`src/components/ui/`)

All primitives are exported from `src/components/ui/index.ts`.

### `Button`

```tsx
<Button variant="primary | secondary | ghost | danger" size="sm | md | lg">
  Label
</Button>
```

### `IconButton`

```tsx
<IconButton size="sm | md | lg" filled={false} label="Close">
  <X size={16} />
</IconButton>
```

### `Card`

```tsx
<Card padding="none | sm | md | lg" className="...">
  content
</Card>
```

### `Input` / `Textarea`

```tsx
<Input label="Base URL" type="text" placeholder="..." />
<Textarea maxHeight={160} placeholder="..." />
```

### `DropdownMenu` / `DropdownMenuItem` / `DropdownMenuDivider`

```tsx
<DropdownMenu
  width={224}
  align="left | right"
  direction="up | down"
  trigger={({ open, toggle }) => <button onClick={toggle}>...</button>}
>
  <DropdownMenuItem active onClick={...}>Option 1</DropdownMenuItem>
  <DropdownMenuDivider />
  <DropdownMenuItem destructive onClick={...}>Delete</DropdownMenuItem>
</DropdownMenu>
```

### `Modal` / `ModalHeader` / `ModalBody` / `ModalFooter`

```tsx
<Modal onClose={handleClose} maxWidth="max-w-md">
  <ModalHeader title="Settings" onClose={handleClose} />
  <ModalBody>content</ModalBody>
  <ModalFooter>buttons</ModalFooter>
</Modal>
```

### Chat Primitives (`src/components/chat/ChatPrimitives.tsx`)

| Component | Description |
|-----------|-------------|
| `ChatHeader` | Top bar with title, model dropdown, close button |
| `ChatMessageArea` | Scrollable message timeline with streaming indicator |
| `ChatInput` | Bottom text input with send button |
| `MessageBubble` | Individual message with expand/collapse |
| `Timeline` | Vertical timeline with message/tool nodes |
| `StreamingIndicator` | "Thinking..." spinner |

---

## 10. Component Conventions

### Styling

1. **Tailwind-first.** Use Tailwind classes for all styling. Only use inline
   `style={}` when Tailwind cannot express it (e.g. dynamic `width` based
   on state, CSS `max-height` with `min()`, complex `transform`).
2. **Use token classes.** Always use the semantic token classes (`text-primary`,
   `bg-surface`, `border-border`, `shadow-dropdown`) rather than raw
   Tailwind colors (`text-gray-900`, `bg-white`).
3. **No hardcoded `fontFamily`.** Use `font-sans`, `font-display`, or
   `font-mono` classes instead of `style={{ fontFamily: 'Inter' }}`.
4. **No hardcoded colors.** If you need a one-off color, add it as a token
   in `tailwind.config.js` first.

### Interactions

1. **Click-outside:** Use `useClickOutside` hook, never raw `addEventListener`.
2. **Escape key:** Use `useEscapeKey` hook.
3. **Dropdowns:** Use `DropdownMenu` primitive or at minimum `useClickOutside`.
4. **Modals:** Use `Modal` primitive (handles backdrop, animation, Escape).

### File Organization

```
src/
  api/             # API client, SSE, types
  components/
    chat/          # ChatModal, FullPageChat, ChatPrimitives
    connectors/    # ConnectorsPage
    dropdowns/     # ModelDropdown, PlusDropdown, StatusFilterDropdown, TaskContextMenu
    files/         # FilesPage
    input/         # CommandInput, TaskStartInput
    landing/       # LandingPage
    layout/        # Sidebar
    markdown/      # Markdown renderer
    shared/        # Badge, Toggle, Avatar
    skills/        # SkillsPage
    tasks/         # TasksPage, TaskList, TaskItem, TaskDetail, TaskFeed, FeedItem
    ui/            # ★ Design system primitives (Button, Card, DropdownMenu, IconButton, Input, Modal, ResizableDivider)
    SettingsModal.tsx
  hooks/           # useClickOutside, useEscapeKey, useChatStream, useWorkflows, etc.
  lib/             # toast, utilities
  styles/          # globals.css
```

### Naming

- Components: PascalCase files, named exports matching filename.
- Hooks: camelCase files starting with `use`, named exports.
- UI primitives live in `src/components/ui/` and are re-exported from `index.ts`.

---

## 11. Icon Conventions

- Library: `lucide-react`
- Default size: `16` for inline/buttons, `18` for sidebar nav
- Default `strokeWidth`: `1.75` for sidebar nav icons
- Color: use Tailwind text classes (`className="text-muted"`) not `color` prop

---

## 12. State & Navigation

- Navigation is **state-driven** in `App.tsx`, not route-driven.
- Active page is tracked via `activeNav` state.
- Sidebar collapse state can be controlled or uncontrolled.
- Modals and chat views are toggled by boolean state in `App.tsx`.

---

## 13. Extending the System

### Adding a new color

1. Add it to `tailwind.config.js > theme.extend.colors`
2. Document it in the Color Tokens table above
3. Use the Tailwind class (e.g. `text-newcolor`, `bg-newcolor`)

### Adding a new UI primitive

1. Create `src/components/ui/NewPrimitive.tsx`
2. Export it from `src/components/ui/index.ts`
3. Document the API in Section 9 above

### Adding a new page

1. Create component in `src/components/<section>/NewPage.tsx`
2. Add nav entry in `Sidebar.tsx` → `getNavItems()`
3. Add page render case in `App.tsx`
4. Use existing primitives (Card, Button, Input) — don't create page-specific copies

---

## 14. Tool Block Conventions

Tool blocks live in `src/components/tool-blocks/` and render collapsible cards
for individual tool calls in the task feed.

| Block | Icon | Accent Color | Usage |
|-------|------|-------------|-------|
| `BashBlock` | `Terminal` | gray-500 | bash, grep, glob commands |
| `FileBlock` | `FileText` | amber-500 | file_read, file_write, file_edit |
| `WebSearchBlock` | `Globe` | blue-500 | web_search, fetch_url |
| `GenericToolBlock` | `Zap` | purple-500 | Fallback for unknown tools |
| `TaskGroupBlock` | — | — | Parallel task groups |
| `PlanningBlock` | — | — | "Planning next step" indicator |

**Shared patterns in all collapsible blocks:**

- Container: `rounded-xl border border-border bg-surface`
- Header button: `hover:bg-surface-hover transition-colors duration-150`
- Expandable panel: `border-t border-border-subtle` (except BashBlock which uses dark terminal theme)
- Status dots: `w-1.5 h-1.5 rounded-full` with `animate-pulse` for running

---

## 15. Refactoring Status

All major pages and components have been migrated from inline styles to
Tailwind token classes using shared UI primitives:

| Component | Status |
|-----------|--------|
| LandingPage | Done |
| TasksPage, TaskList, TaskItem, TaskDetail | Done |
| TaskFeed, FeedItem | Done |
| FilesPage | Done |
| ConnectorsPage | Done |
| SkillsPage | Done |
| App.tsx | Done |
| Tool blocks (Bash, File, Web, Generic, TaskGroup, Planning) | Done |
| Sidebar | Done (earlier) |
| ChatModal, FullPageChat | Done (earlier) |
| Settings modal | Done (earlier) |
| Dropdowns (Model, Plus, StatusFilter, TaskContext) | Done (earlier) |
| Markdown | Clean — no inline styles |

**Remaining raw Tailwind colors** (intentional):
- `BashBlock` terminal: `bg-gray-950`, `text-gray-300`, `border-gray-800` — dark terminal theme
- `BashBlock` label: `bg-gray-900 text-gray-300` — terminal-style label pill
- `TaskGroupBlock` status icons: semantic `text-green-600`, `text-red-500`, `text-blue-500`
- `PlanningBlock` dots: `bg-gray-400` — neutral loading indicator
- Tool block status dots: `bg-amber-500`, `bg-green-500`, `bg-red-500`, `bg-blue-500`, `bg-purple-500`

These are intentional accent/semantic colors that don't need tokenization.
