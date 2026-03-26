# Component Inventory — Relay Pro Frontend

> Living map of current and target component architecture.  
> Last updated: 2026-03-25

---

## Legend

| Decision | Meaning |
|----------|---------|
| ✅ KEEP | Good as-is. Well-structured, fits system. |
| 🔧 IMPROVE | Minor changes needed (token fixes, API cleanup). |
| 🔄 REPLACE | Should be replaced with shared primitive. |
| 🧩 WRAP | Should be wrapped in a house component. |
| ✂️ SPLIT | God file — should be split into sub-components. |
| 🗑️ REMOVE | Unused or redundant, can be removed. |

---

## Core UI Primitives (`src/components/ui/`)

| Component | Lines | Decision | Notes |
|-----------|-------|----------|-------|
| `Button.tsx` | 55 | ✅ KEEP | 4 variants × 3 sizes, forwardRef, well-typed |
| `IconButton.tsx` | 47 | ✅ KEEP | sm/md/lg + filled option, consistent |
| `Input.tsx` + `Textarea` | 75 | ✅ KEEP | Auto-growing textarea, label support |
| `Card.tsx` | 35 | ✅ KEEP | 4 padding presets, minimal surface container |
| `Modal.tsx` + sub-components | 105 | ✅ KEEP | Header/Body/Footer, Escape handling, animation |
| `DropdownMenu.tsx` + items | 113 | ✅ KEEP | Direction+align configurable, click-outside built-in |
| `Skeleton.tsx` | 59 | ✅ KEEP | 4 preset shapes, good shimmer animation |
| `ResizableDivider.tsx` | 116 | ✅ KEEP | Used in task/detail split view |
| `SearchInput.tsx` | 42 | ✅ KEEP | Icon + input + clear button |
| `Select.tsx` | 53 | ✅ KEEP | forwardRef Select with label, options array, placeholder |

---

## Shared Micro-Components (`src/components/shared/`)

| Component | Lines | Decision | Notes |
|-----------|-------|----------|-------|
| `Avatar.tsx` | 15 | 🔧 IMPROVE | Uses inline style for size — could accept className |
| `Badge.tsx` | 33 | ✅ KEEP | 8 status color mappings, well-typed |
| `Toggle.tsx` | 31 | ✅ KEEP | Smooth animation, accessible role="switch" |
| `StatusDot.tsx` | NEW | ✅ KEEP | New: extracted from TaskItem — status dot + pulse |

---

## Layout (`src/components/layout/`)

| Component | Lines | Decision | Notes |
|-----------|-------|----------|-------|
| `Sidebar.tsx` | 373 | 🔧 IMPROVE | Good overall. Hardcoded colors fixed. Profile menu could use DropdownMenu primitive. |

---

## Page Components

| Component | Lines | Decision | Notes |
|-----------|-------|----------|-------|
| `LandingPage.tsx` | 263 | ✅ KEEP | Clean. Voice button fixed to use IconButton. |
| `TasksPage.tsx` | 253 | 🔧 IMPROVE | Empty state improved. Overall clean layout. |
| `TaskList.tsx` | 320 | 🔧 IMPROVE | Search migrated to SearchInput. Still mixes billing state + view. |
| `TaskDetail.tsx` | 182 | 🔧 IMPROVE | Workflow control buttons migrated to Button component. |
| `FeedItem.tsx` | 124 | ✅ KEEP | Split complete — sub-renderers in `tasks/feed/` |
| `TaskFeed.tsx` | 296 | ✅ KEEP | Clean timeline orchestration. |
| `TaskItem.tsx` | 158 | 🔧 IMPROVE | StatusDot extracted. Still handles relative time formatting inline. |
| `ConnectorsPage.tsx` | 191 | ✅ KEEP | Split complete — 5 tab components in `connectors/` |
| `FilesPage.tsx` | 515 | 🔧 IMPROVE | Large but concerns are related (file management). |
| `SkillsPage.tsx` | 428 | ✅ KEEP | Skills management, reasonably scoped. |
| `SettingsModal.tsx` | 215 | ✅ KEEP | Uses useSettingsState hook + 3 extracted panels |
| `SettingsPage.tsx` | 576 | 🔧 IMPROVE | Full-page settings. Uses useSettingsState hook. Renders connectors/icons inline. |

---

## Input Components (`src/components/input/`)

| Component | Lines | Decision | Notes |
|-----------|-------|----------|-------|
| `CommandInput.tsx` | 114 | 🔧 IMPROVE | Migrated to use Textarea + IconButton primitives. |
| `TaskStartInput.tsx` | 59 | 🔧 IMPROVE | Exists but not used by TaskList (TaskList has inline input). Opportunity to consolidate. |

---

## Chat Components (`src/components/chat/`)

| Component | Lines | Decision | Notes |
|-----------|-------|----------|-------|
| `ChatModal.tsx` | 129 | ✅ KEEP | Clean wrapper over ChatPrimitives. |
| `FullPageChat.tsx` | 97 | ✅ KEEP | Clean full-page variant. |
| `ChatPrimitives.tsx` | 240 | ✅ KEEP | Good shared message primitives (MessageBubble, InputArea, StreamingIndicator). |

---

## Dropdown Components (`src/components/dropdowns/`)

| Component | Lines | Decision | Notes |
|-----------|-------|----------|-------|
| `ModelDropdown.tsx` | 159 | ✅ KEEP | Uses DropdownMenu. Provider grouping, model icons. |
| `StatusFilterDropdown.tsx` | 66 | ✅ KEEP | Uses DropdownMenu. Clean. |
| `TaskContextMenu.tsx` | 72 | ✅ KEEP | Context menu with delete/pin/rename. |
| `PlusDropdown.tsx` | 129 | ✅ KEEP | File upload + connectors. |

---

## Tool Block Components (`src/components/tool-blocks/`)

| Component | Decision | Notes |
|-----------|----------|-------|
| `BashBlock.tsx` | ✅ KEEP | Terminal-themed intentionally (uses gray-950 etc.) |
| `FileBlock.tsx` | ✅ KEEP | Clean file operations display. |
| `WebSearchBlock.tsx` | ✅ KEEP | Clean search results display. |
| `PlanningBlock.tsx` | ✅ KEEP | Planning indicator. |
| `TaskGroupBlock.tsx` | ✅ KEEP | Task parallel group. |
| `GenericToolBlock.tsx` | ✅ KEEP | Fallback block. |

---

## Standalone Components (root level of `src/components/`)

| Component | Decision | Notes |
|-----------|----------|-------|
| `ErrorBoundary.tsx` | ✅ KEEP | Standard error boundary. |
| `CommandPalette.tsx` | 🔧 IMPROVE | Could use SearchInput for the search field. |
| `OnboardingModal.tsx` | ✅ KEEP | First-run experience, uses Modal. |
| `KeyboardShortcuts.tsx` | ✅ KEEP | Overlay with shortcut grid. |
| `NotificationCenter.tsx` | ✅ KEEP | Bell + notification dropdown. |
| `WorkflowProgress.tsx` | ✅ KEEP | Progress bar with task breakdown. |
| `ApprovalGate.tsx` | ✅ KEEP | Approval UI with confirm/deny buttons. |
| `AgentHealthPanel.tsx` | ✅ KEEP | Health status panel. |
| `BillingDashboard.tsx` | ✅ KEEP | Usage and billing display. |
| `CitationCard.tsx` | ✅ KEEP | Source citation display card. |
| `TemplatesGallery.tsx` | ✅ KEEP | Workflow template selection. |
| `SettingsRoutingPanel.tsx` | 121 | ✅ KEEP | Agent-to-model routing config. |
| `SettingsConnectorsPanel.tsx` | 170 | ✅ KEEP | Connector OAuth/validate/disconnect. |
| `SettingsIconsPanel.tsx` | 86 | ✅ KEEP | Per-model icon override selection. |

---

## Connectors Sub-Components (`src/components/connectors/`)

| Component | Lines | Decision | Notes |
|-----------|-------|----------|-------|
| `ConnectorsTab.tsx` | 98 | ✅ KEEP | Provider cards with OAuth connect flow |
| `SchedulesTab.tsx` | 157 | ✅ KEEP | Schedule CRUD + creation dialog |
| `MemoryTab.tsx` | 89 | ✅ KEEP | Memory list + save dialog |
| `TeamsTab.tsx` | 52 | ✅ KEEP | Teams display with status handling |
| `TemplatesTab.tsx` | 59 | ✅ KEEP | Template gallery with launch flow |
| `TabPill.tsx` | 14 | ✅ KEEP | Reusable tab pill button |
| `connectorsHelpers.ts` | 77 | ✅ KEEP | Shared types, constants, formatters |

---

## Hooks (`src/hooks/`)

| Hook | Lines | Decision | Notes |
|------|-------|----------|-------|
| `useSettingsState.ts` | 213 | ✅ KEEP | Shared settings state for SettingsModal + SettingsPage |
| `useBillingBalance.ts` | — | ✅ KEEP | Billing data fetching |
| `useChatStream.ts` | — | ✅ KEEP | Chat streaming hook |
| `useClickOutside.ts` | — | ✅ KEEP | Click-outside detection |
| `useConfig.ts` | — | ✅ KEEP | App configuration |
| `useEscapeKey.ts` | — | ✅ KEEP | Escape key handler |
| `useNotifications.ts` | — | ✅ KEEP | Notification management |
| `useWorkflowMeta.ts` | — | ✅ KEEP | Workflow metadata |
| `useWorkflowStream.ts` | — | ✅ KEEP | Workflow event streaming |
| `useWorkflows.ts` | — | ✅ KEEP | Workflow list management |

---

## Icons (`src/components/icons/`)

| Component | Decision | Notes |
|-----------|----------|-------|
| `CustomIcons.tsx` | ✅ KEEP | 15+ custom SVG icons for sidebar nav, UI controls. Clean API. |

---

## Buttons — Full Inventory

### Using `Button` component ✅
- TaskList: Coins pill, Cancel/Save in rename modal
- SettingsModal: Save, Connect, Disconnect
- ApprovalGate: Approve/Deny
- Various modal footers

### Using `IconButton` component ✅
- TaskDetail: Collapse button
- TaskList: Search, Chat open buttons
- LandingPage: Send button, attachment remove buttons

### Raw `<button>` elements (intentional exceptions)
- Sidebar nav items — thin wrapper buttons with custom active states (acceptable)
- Sidebar profile menu items — custom layout, acceptable
- TaskItem — the list item itself is a div-as-button (accessibility concern, but works)
- Various close/toggle buttons using `.nav-item` class

### Previously raw, now fixed ✅
- TaskDetail Retry/Pause/Cancel/Resume → now use `Button` component
- CommandInput send → now uses `IconButton`
- LandingPage voice button → now uses `IconButton`

---

## Inputs — Full Inventory

### Using `Input` component ✅
- SettingsModal: Base URL field
- TaskList: Rename modal
- Various form fields

### Using `Textarea` component ✅
- LandingPage: Main prompt textarea
- CommandInput: Follow-up input (after fix)

### Using `SearchInput` component ✅ (new)
- TaskList: Header search (after migration)

### Raw `<input>` elements (acceptable)
- Chat input in ChatPrimitives (custom design, different from form inputs)

---

## Loading States — Full Inventory

| Pattern | Location | Standard? |
|---------|----------|-----------|
| `SkeletonTaskItem` | TaskList loading | ✅ Uses Skeleton |
| `SkeletonFeedItem` | FeedItem loading | ✅ Uses Skeleton |
| `Loader2 animate-spin` | App.tsx auth loading | ✅ Lucide standard |
| `w-1.5 h-1.5 animate-pulse bg-info` | TaskList polling indicator | ✅ Simple dot |
| `shimmer-text` CSS class | Thinking indicator in feed | ✅ Custom animation |

---

## Empty States — Full Inventory

| Location | Content | Quality |
|----------|---------|---------|
| TaskList: no workflows | Icon + "No tasks yet" + hint | ✅ Good |
| TasksPage: no task selected | "Select a task to view details" | 🔧 Improved |
| FilesPage: no files | Unknown | 🟡 Not audited |
| ConnectorsPage: no connectors | Unknown | 🟡 Not audited |
