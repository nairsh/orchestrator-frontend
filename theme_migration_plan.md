# Theme Migration Plan — Relay Pro Frontend

> Mapping from current UI to target standardized component system.
> Includes Phase 2 Lobe UI evaluation and mandatory LobeHub discovery section.

---

## Section 1 — Phase 2 Lobe UI Replacement Strategy

For each component category: current project component(s), candidate standardized primitive, wrap/replace/keep decision, visual customizations required, and migration timeline.

### 1.1 Buttons

| Current | Candidate | Wrap? | Visual Customizations | Decision |
|---------|-----------|-------|----------------------|----------|
| `Button` (4 variants: primary/secondary/ghost/danger, 3 sizes) | House component is strong | N/A — keep house | None needed | ✅ **Keep** — already standardized |
| Raw `<button>` in TaskDetail (Retry/Pause/Cancel/Resume) | `Button` | No — use directly | `className` overrides for info/accent tints | ✅ **Replaced** |
| Raw `<button>` send in CommandInput | `IconButton` filled | No | None | ✅ **Replaced** |
| Raw `<button>` voice in LandingPage | `IconButton` | No | None | ✅ **Replaced** |
| Raw `<button>` close in ConnectorsPage dialogs (2×) | `IconButton` | No | Add `aria-label` | 🔧 **Immediate** |
| Raw `<button>` close in OnboardingModal | `IconButton` | No | Add `aria-label` | 🔧 **Immediate** |
| Raw `<button>` close in KeyboardShortcuts | `IconButton` | No | Standardize | 🔧 **Immediate** |
| Raw `<button>` close in FilesPage (2×) | `IconButton` | No | Standardize | 🔧 **Immediate** |
| Sidebar nav items | Keep raw | N/A | Custom active-state layout doesn't fit Button API | ✅ **Keep** |
| Sample prompt buttons (LandingPage) | Keep raw | N/A | Pure text, no button chrome intended | ✅ **Keep** |
| Onboarding Skip/Next | Keep raw | N/A | Modal-specific styling, simple text buttons | ✅ **Keep** |

### 1.2 Action Buttons / Icon Buttons

| Current | Candidate | Decision |
|---------|-----------|----------|
| `IconButton` (sm/md/lg, filled variant) | House component is strong | ✅ **Keep** |
| `@lobehub/ui ActionIcon` | Not needed — house `IconButton` covers same API | ❌ **Skip** |
| Collapse/expand sidebar toggle | Uses `IconButton` | ✅ Already standardized |
| All icon triggers (search, new task, back) | Uses `IconButton` | ✅ Already standardized |

### 1.3 Search Bars

| Current | Candidate | Decision |
|---------|-----------|----------|
| `SearchInput` (icon + input + clear + Escape) | House component, newly created | ✅ **Keep** |
| TaskList search | `SearchInput` | ✅ **Replaced** |
| Sidebar search (Cmd+K) | Uses custom focus handler | ✅ **Keep** — keyboard shortcut, not a search bar |

### 1.4 Text Inputs

| Current | Candidate | Decision |
|---------|-----------|----------|
| `Input` (border, focus ring, disabled) | House component | ✅ **Keep** |
| `Textarea` (auto-grow, maxHeight) | House component | ✅ **Keep** |
| CommandInput textarea | `Textarea` | ✅ **Replaced** |
| TaskStartInput raw `<textarea>` | `Textarea` | 🔧 **Immediate** |
| Chat primitives textarea | Keep custom | ✅ **Keep** — borderless design is intentional |
| OnboardingModal textbox | Keep custom | ✅ **Keep** — modal-integrated |
| Rename input in TaskList | Uses `Input` | ✅ Already standardized |

### 1.5 Selects / Dropdowns

| Current | Candidate | Decision |
|---------|-----------|----------|
| `DropdownMenu` + `DropdownMenuItem` + `DropdownMenuDivider` | House component | ✅ **Keep** |
| `ModelDropdown` | Uses `DropdownMenu` | ✅ Already standardized |
| `StatusFilterDropdown` | Uses `DropdownMenu` | ✅ Already standardized |
| `PlusDropdown` | Custom (file input trigger) | ✅ **Keep** — HTML file input requires raw handling |
| `TaskContextMenu` | Uses `DropdownMenu` | ✅ Already standardized |
| Settings icon selector | Uses `DropdownMenu` | ✅ Already standardized |

### 1.6 Tabs

| Current | Candidate | Decision |
|---------|-----------|----------|
| TasksPage sub-nav (Tasks/Files/Connectors/Skills) | Custom `nav-item` pill tabs | ✅ **Keep** — simple, clean, product-specific |
| Settings tabs | Keep custom | ✅ **Keep** |
| No @lobehub/ui Tabs used | — | ❌ **Skip** — house tabs are minimal and effective |

### 1.7 Drawers / Modals

| Current | Candidate | Decision |
|---------|-----------|----------|
| `Modal` + `ModalHeader` + `ModalBody` + `ModalFooter` | House component | ✅ **Keep** |
| Rename modal | Uses `Modal` | ✅ Already standardized |
| Settings modal | Uses `Modal` | ✅ Already standardized |
| Onboarding modal | Uses `Modal` | ✅ Already standardized |
| ConnectorsPage schedule dialog | Raw div overlay | 🔧 **Immediate** — migrate to `Modal` |
| ConnectorsPage memory dialog | Raw div overlay | 🔧 **Immediate** — migrate to `Modal` |
| @lobehub/ui `DraggablePanel` | Could replace `ResizableDivider` | 🔵 **Deferred** — current component works well |

### 1.8 Cards / Surfaces

| Current | Candidate | Decision |
|---------|-----------|----------|
| `Card` (4 padding presets: none/sm/md/lg) | House component | ✅ **Keep** |
| LandingPage input card | Custom `rounded-[20px]` | ✅ **Keep** — intentional hero treatment |
| Tool blocks (BashBlock, FileBlock, etc.) | Keep custom surfaces | ✅ **Keep** — terminal aesthetic is intentional |
| TaskList start input area | Uses `bg-surface-tertiary` | ✅ Consistent |
| Approval gate card | Uses custom amber surface | 🔧 **Tokenize** — replace hardcoded amber with semantic warning tokens |

### 1.9 Loading States / Skeletons

| Current | Candidate | Decision |
|---------|-----------|----------|
| `Skeleton` (base + SkeletonText + SkeletonTaskItem + SkeletonFeedItem) | House component | ✅ **Keep** |
| TaskList loading | Uses `SkeletonTaskItem` | ✅ Already standardized |
| TaskFeed loading | Uses `SkeletonFeedItem` | ✅ Already standardized |
| Auth screen spinner | `Loader2` lucide icon | ✅ **Keep** — minimal, intentional |
| Agent health loading | Inline shimmer | ✅ **Keep** — shimmer-text class is standardized |

### 1.10 Menus

| Current | Candidate | Decision |
|---------|-----------|----------|
| `DropdownMenu` system | House component | ✅ **Keep** |
| Context menus (right-click) | Not implemented | 🔵 **Deferred** — not currently needed |
| Sidebar profile menu | Custom upward popover | ✅ **Keep** — unique layout |

### 1.11 Segmented Controls

| Current | Candidate | Decision |
|---------|-----------|----------|
| No segmented controls in codebase | — | ❌ **Not applicable** |
| @lobehub/ui SegmentedControl | — | ❌ **Skip** — no use case currently |

### 1.12 Tooltips

| Current | Candidate | Decision |
|---------|-----------|----------|
| HTML `title` attributes on buttons | Native browser tooltips | ✅ **Keep** — simple, zero-JS |
| `IconButton` `label` prop → `title` | Built into house component | ✅ Already standardized |
| No custom tooltip component needed | — | ❌ **Skip** — native `title` is sufficient for current density |

### 1.13 List Rows / Result Items

| Current | Candidate | Decision |
|---------|-----------|----------|
| `TaskItem` (workflow list row) | Custom house component | ✅ **Keep** — uses `StatusDot`, tokens, complex layout |
| Search results in FeedToolCall | Custom link rows with favicons | ✅ **Keep** — specialized rendering |
| Connector cards (ConnectorsPage) | Custom card per connector | ✅ **Keep** — gradient branding per service |
| Skill cards (SkillsPage) | Custom card layout | ✅ **Keep** |

---

## Section 2 — Visual Customizations Applied

### To preserve product style while standardizing:

1. **Button `primary` variant**: Uses `bg-ink` (near-black) not a blue/accent color — preserves the product's restrained aesthetic.

2. **TaskDetail workflow buttons**: Small `size="sm"` buttons with semantic `variant` (info-ish for retry, ghost for pause, danger for cancel, accent for resume). Custom `className` overlays for specific tints where Button variants don't map directly.

3. **SearchInput**: Inherits the same `border-border-light`, `bg-surface`, `text-primary`, `placeholder:text-placeholder` tokens as `Input` — feels native to the system.

4. **StatusDot**: Uses the product's own color tokens (warning, danger, accent, etc.) not raw Tailwind colors.

5. **Semantic status tokens**: Success (green), warning (amber), danger (red), info (blue) defined as CSS variables with RGB triples for opacity support. Both dark and light theme variants.

---

## Section 3 — Migration Rules Applied

✅ Only components where standardization improves consistency, maintainability, or UX were migrated.  
✅ No components were swapped for the sake of it.  
✅ Visual identity preserved throughout.  
✅ Shared wrapper layer used rather than scattered raw library imports.  
✅ House-level components wrap any external or new behavior.  
✅ Components not replaced: sidebar nav (custom layout), sample prompt buttons (pure text), chat primitives textarea (borderless design), tool block surfaces (terminal aesthetic).

---

## Section 4 — Mandatory LobeHub Discovery Pass

> This section documents the post-task review of LobeHub / Lobe UI package landscape.

### Packages Currently Installed

| Package | Version | Current Usage |
|---------|---------|---------------|
| `@lobehub/icons` | ^5.0.1 | ⚠️ React component API requires React 19+ (project uses React 18) |
| `@lobehub/icons-static-svg` | ^1.82.0 | ✅ **Adopted** — static SVGs used as model icon source |

### @lobehub/icons-static-svg — Adopted ✅

802 static SVGs available. Verified that the project's `/public/model-icons/` SVG files are sourced from this package:

| Provider Icon | Status | Notes |
|---|---|---|
| openai.svg | ✅ Identical to LobeHub | Already using LobeHub SVG |
| claude.svg | ✅ Identical | claude-color.svg |
| gemini.svg | ✅ Identical | gemini-color.svg |
| groq.svg | ✅ Identical | |
| deepseek.svg | ✅ Identical | deepseek-color.svg |
| qwen.svg | ✅ Identical | qwen-color.svg |
| minimax.svg | ✅ Identical | minimax-color.svg |
| meta.svg | ✅ Identical | meta-color.svg |
| perplexity.svg | ✅ Identical | perplexity-color.svg |
| nvidia.svg | ✅ Identical | nvidia-color.svg |
| mistral.svg | ✅ Identical | mistral-color.svg |
| kimi.svg | 🔧 Updated | Replaced with kimi-color.svg (explicit colors vs currentColor) |
| zai.svg | 🔧 Updated | Replaced with zhipu-color.svg (higher quality) |

### @lobehub/icons React Components — Blocked

**Status:** Cannot use React component API — requires React 19+ as peer dependency, project locked to React 18.3.1.

**Alternative adopted:** Use `@lobehub/icons-static-svg` files directly in `/public/model-icons/`. This provides the same visual quality without the React version conflict.

### @lobehub/ui — NOT Installed

**Assessment:** The project already has a well-built house component system covering all primitives. Adding @lobehub/ui would introduce ~200KB+ of additional JS and require React 19.

| Component | Assessment | Decision | Rationale |
|-----------|------------|----------|-----------|
| `ActionIcon` | Duplicate of `IconButton` | ❌ Skip | House component is superior for this codebase |
| `Input` / `TextArea` | Duplicate of `Input` / `Textarea` | ❌ Skip | House versions already use design tokens |
| `Modal` | Duplicate of `Modal` | ❌ Skip | House version already has Header/Body/Footer |
| `Markdown` renderer | Enhanced vs current react-markdown | 🔵 Deferred | Would need React 19 migration first |
| `DraggablePanel` | Could replace ResizableDivider | 🔵 Deferred | Current component works, would need React 19 |
| `HighlightText` | Search result highlighting | 🔵 Deferred | Future feature, not current need |
| `Progress` | Alternative to WorkflowProgress | ❌ Skip | WorkflowProgress is product-specific |
| `Spotlight` / CommandPalette | Alternative to Cmd+K | ❌ Skip | Not needed |
| `FluentEmoji` | Emoji rendering | ❌ Skip | Not needed |
| `Tag` / `Badge` | Status badges | ❌ Skip | Not needed — StatusDot covers status display |
| `CodeEditor` | Code editing | ❌ Skip | Not in scope |

---

## Section 5 — Immediate Action Items

### From Phase 2 evaluation (🔧 Immediate):

1. **Close buttons → IconButton**: ConnectorsPage (2×), OnboardingModal, KeyboardShortcuts, FilesPage (2×) — add `aria-label`, use `IconButton`
2. **ConnectorsPage dialogs → Modal**: Schedule and memory dialogs use raw div overlays — migrate to `Modal` component
3. **TaskStartInput → Textarea**: Replace raw `<textarea>` with `Textarea` primitive
4. **Approval gate → semantic tokens**: Replace hardcoded amber colors with `warning` design tokens
5. **Hardcoded Tailwind status colors**: Replace ~50 instances of `text-green-500`, `text-red-500`, `text-amber-500`, `bg-blue-500` etc. with semantic `text-success`, `text-danger`, `text-warning` tokens across WorkflowProgress, AgentHealthPanel, BillingDashboard, tool-blocks
6. **Clickable overlay divs**: Add `role="button"` and `aria-label` to overlay click handlers

### Deferred (requires React 19 migration):

- @lobehub/icons React components
- @lobehub/ui enhanced Markdown renderer
- @lobehub/ui DraggablePanel

---

## Section 6 — Staged Migration Timeline

### Phase 1 (Completed ✅)
- Design token foundation (sidebar-accent, avatar-bg, status-paused, sidebar-sep)
- Button/Input/Search primitive usage normalization
- StatusDot component extraction
- FeedItem god file split (802 → 124 lines)
- Model icon SVGs verified/updated from @lobehub/icons-static-svg
- All 7 documentation deliverables created

### Phase 2 (In Progress 🔧)
- Semantic status color tokens (success, warning-surface, warning-border)
- Close button standardization across all dialogs
- ConnectorsPage dialog → Modal migration
- TaskStartInput → Textarea migration
- Hardcoded color token migration (~50 instances)
- Accessibility fixes (aria-label, role="button")
- Inline style → Tailwind class migration

### Phase 3 (Future)
- ConnectorsPage god file split (808 lines)
- React 19 migration (unblocks @lobehub/icons React API, @lobehub/ui)
- @lobehub/ui enhanced Markdown renderer evaluation
- E2E testing infrastructure
