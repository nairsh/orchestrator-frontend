# Improvement Log

## Batch 51 — Critical Bug Fixes (User-Reported)

### Phase 1: Deep Codebase Research
- **Frontend**: 108 components inventoried across layout, landing, tasks, chat, settings, shared, dropdowns
- **Backend**: Node.js + Fastify, pnpm monorepo with 9 packages, SQLite + WAL mode, SSE for real-time
- **Architecture**: State-based routing (no React Router), prop drilling + hooks, Clerk auth (optional)

### Fixes Applied

#### 1. Plus Dropdown Hidden by Suggestion Pills
**Files**: `LandingPage.tsx`, `PlusDropdown.tsx`
**Root cause**: PlusDropdown's `openUpward` prop wasn't respected — direction was always dynamically calculated. On landing page, plenty of space below caused downward opening into the suggestion pills.
**Fix**: Force `menuDirection = 'up'` when `openUpward` is true. Added `z-10` to search box container, `z-0` to sample prompts.

#### 2. Notifications Dropdown Not Rendering
**Files**: `NotificationCenter.tsx`
**Root cause**: Sidebar's `<aside>` has `overflow-hidden` (required for width transition animation), which clips all absolutely-positioned children.
**Fix**: Converted to `createPortal` rendering into `document.body` with fixed positioning. Left-aligned from bell button, opens upward. Added click-outside handling for the portal.

#### 3. Bash Commands Missing Left Padding
**Files**: `BashRenderer.tsx`
**Root cause**: `<Highlighter variant="borderless">` sets `pre { padding: 0 }`. Other renderers have their own padding but BashRenderer didn't.
**Fix**: Wrapped `<Highlighter>` components in `<div className="px-3">` for both command and output sections.

#### 4. Timeline Ordering Broken in Multi-Turn Workflows
**Files**: `feedMutations.ts`
**Root cause**: `upsertActiveTaskGroup` used `feed.findIndex()` to locate terminal entries (completion/failure). `findIndex` searches from index 0, so in multi-turn conversations it finds the FIRST turn's completion entry and inserts the new task_group before it — inside the wrong turn.
**Fix**: Changed terminal entry search to start from `lastConversationIndex` (the position of the last `ai_conversation_start` marker), ensuring task_groups are inserted into the correct turn.

### Verified
- TypeScript compilation: ✅
- Vite production build: ✅
- Visual verification (browser): ✅ Plus dropdown opens upward, notifications render via portal, bash has padding

---

## Batch 52 — UI Polish (User-Reported)

### Fixes Applied

#### 5. Send Button Too Large in Task Detail
**Files**: `CommandInput.tsx`, `TaskDetail.tsx`
**Fix**: Reduced from `size='lg'` (44px) to fixed `w-8 h-8` (32px), matching the landing page send button. Removed unused `compactSendButton` prop.

#### 8. Tasks Keyboard Shortcut Changed
**Files**: `KeyboardShortcuts.tsx`, `sidebar-types.tsx`, `useAppState.ts`
**Fix**: Changed Tasks navigation from G+T (vim-style two-key) to ⌘+Shift+O. Added dedicated keydown handler for meta+shift+o. Other G+key shortcuts (Files, Connectors, Skills) preserved.

#### 16. Model Dropdown Tags Removed
**Files**: `ModelDropdown.tsx`
**Fix**: Removed Fast/Smart/Cheap capability tags and their icons. Reduced dropdown width from 320px to 260px. Clean model list with just icons and names.

#### 7. Clerk Username Display (Verified Working)
Clerk integration is fully functional. Shows real username when Clerk account has name set. Shows "User" as fallback for accounts without names. Shows "Guest" in local mode (no Clerk key).

### Verified
- TypeScript compilation: ✅
- Visual verification: ✅ Send button 32px, model dropdown clean, ⌘⇧O shown in sidebar

---

## Batch 53 — Dead Code Cleanup & Quality Improvements

### Dead Code Removed (-196 net lines)
- **SettingsConnectorsPanel.tsx** (root level, 177 lines) — duplicate of `settings/SettingsConnectorsPanel.tsx`. Updated `SettingsModal.tsx` import.
- **Toggle.tsx × 2** (ui/ 24 lines + shared/ 30 lines) — neither imported anywhere in codebase.

### Error Handling & Accessibility
- **CopyButton.tsx**: Fixed setTimeout leak — added ref-based cleanup on unmount
- **ConnectorsTab.tsx**: Added `aria-label="Cancel"` to disconnect dismiss button
- **KnowledgeSection.tsx**: Added inline delete confirmation (matches ConnectorsTab pattern)

### UX Fixes
- **TaskDetail.tsx**: Raw model IDs like `litellm/ali/MiniMax-M2.5` now humanized to `MiniMax M2.5` using `humanizeModelName()`

### Verified
- TypeScript compilation: ✅
- Visual verification: ✅ Model name humanized, delete confirmation works

---

## Batch 54 — UX Polish & Error Handling

### Ellipsis Standardization
- Replaced raw `'...'` with proper `'…'` (U+2026) across 8 files (11 edits total)
- Changed "Opening..." → "Signing in…" for OAuth flows in ConnectorsTab
- Files: SettingsModal, ChatPrimitives, ConnectorsTab, MemoryTab, FilesPage, SkillEditorModal, TaskItem, CommandPalette

### Interaction Fixes
- **CommandPalette.tsx**: Added missing `group` class to action buttons — ArrowRight icon now shows on hover as intended
- **TaskItem.tsx**: Cancelled task status color changed from `text-placeholder` (too faint) to `text-muted` for better readability

### Error State
- **BillingDashboard.tsx**: Added error state UI with AlertTriangle icon and "Try again" button when all 3 API calls fail (balance, usage, transactions). Previously failed silently.

### Verified
- TypeScript compilation: ✅
- 9 files changed, 32 insertions, 14 deletions

---

## Batch 55 — Dark Mode Fixes, Shortcuts, Memory Leak

### Dark Mode
- **Model icons**: Added theme-aware CSS filter — `invert(1)` in dark mode so icons display white on dark backgrounds. Previously `brightness-0` forced all icons black (invisible in dark mode).
- **User bubble border**: Changed `border-border-light/80` → `border-border-subtle/40` to eliminate visible white outline in dark mode.

### Keyboard Shortcuts
- **Removed G-prefix system**: Eliminated entire G+key two-key navigation (G+F, G+C, G+S) and the `gPrefixRef` mechanism.
- **Standard ⌘⇧ shortcuts**: Files → ⌘⇧E, Connectors → ⌘⇧L, Skills → ⌘⇧K (joining existing Tasks → ⌘⇧O). All handled in single consolidated useEffect.

### Bug Fixes
- **SSE memory leak** (sse.ts): Both `connectWorkflowStream` and `streamAgentResponse` now properly remove abort event listeners via `removeEventListener` in `close()`. Previously listeners accumulated on repeated stream connections.
- **React key** (TeamsTab.tsx): Replaced `Math.random()` fallback with stable `team-{id|idx}` key.

### Accessibility
- **SkillDetailPanel.tsx**: Added Escape key to overlay onKeyDown handler.

### Verified
- TypeScript compilation: ✅
- Visual verification: ✅ Model icons white in dark mode, user bubble border subtle, shortcuts displayed correctly in sidebar

---

## Batch 56 — Performance, Stability, Accessibility

### Performance
- **CitationCard**: Wrapped with `React.memo` to prevent unnecessary re-renders in feed lists.
- **TaskFeed**: Extracted magic number `1400` → `PARALLEL_TOOL_WINDOW_MS` named constant.

### Stability
- **FeedItem citation keys**: Changed from index-only to `${citation.url}-${idx}` for stable React reconciliation.
- **ChatPrimitives**: Last remaining `Thinking...` → `Thinking…` ellipsis fix.

### Accessibility
- **OnboardingModal**: Added Escape key handler via useEffect to dismiss modal.

### Verified
- TypeScript compilation: ✅

---

## Batch 57 — Mobile Responsive Sidebar

### Mobile Support
- **useIsMobile hook**: Created new hook using `matchMedia` at 768px breakpoint.
- **Sidebar**: Added 4 render paths — mobile-collapsed (hamburger), mobile-expanded (portal overlay with backdrop), desktop-collapsed (icon rail), desktop-expanded (full sidebar).
- **Auto-collapse**: Sidebar auto-collapses when viewport shrinks to mobile.
- **Nav dismissal**: Sidebar auto-closes on mobile after navigation.
- **Animation**: Added `slideInLeft` keyframes with `prefers-reduced-motion` support.
- **Desktop**: Completely unchanged at ≥768px.

### Verified
- TypeScript compilation: ✅
- Visual verification at 375px, 767px, 768px, 1440px: ✅

---

## Batch 58 — Responsive Page Padding

### Layout
- **Settings**: Nav switches from vertical sidebar to horizontal scrolling tabs on mobile via `flex-col md:flex-row`.
- **All content pages**: Responsive `px-4 md:px-8` padding (ConnectorsPage, FilesPage, SkillsPage, SettingsPage).
- **Settings**: Fixed word-break issues ("Connec-tion", "Accoun-t") on narrow viewports.

### Verified
- TypeScript compilation: ✅
- Visual verification on mobile (375px): ✅

---

## Batch 59 — React.memo + Skills Header Fix

### Performance
- **FeedItem**: Wrapped with `React.memo`, extracted `FeedItemProps` interface.
- **TaskItem**: Wrapped with `React.memo`.

### Layout
- **SkillsPage**: Fixed header overflow on mobile — added `flex-wrap` and narrower search input `w-[140px] md:w-[200px]`.

### Verified
- TypeScript compilation: ✅
- All pages verified on mobile: ✅

---

## Batch 60 — Remove Templates, Schedule Expression, Upload Button

### User Items
- **Item 30**: Removed cron/schedule expression from "new schedule" dialog — simplified to interval-only.
- **Item 31**: Removed Templates tab from Connectors page, deleted `TemplatesTab.tsx`. Backend template routes unregistered.
- **Item 34**: Moved upload button from Files header to right side of "Knowledge Library" heading.

### Cleanup
- Removed `Segmented` control from schedule dialog.
- Cleaned up unused state variables and imports (`scheduleType`, `scheduleCron`, `ScheduleType`).
- Updated sign-in prompt text to remove "templates" reference.

### Verified
- TypeScript compilation: ✅
- Visual verification: Templates tab gone, schedule dialog simplified, upload button repositioned.

---

## Batch 61 — Unused Import & Dead Code Cleanup

### Code Quality
- Removed 28 unused imports/variables across 19 files.
- Removed dead functions: `shortcutToKeys`, `AGENT_LABELS` map.
- Removed dead state: `workflowSearch`/`setWorkflowSearch` (always empty string).
- Simplified `filteredWorkflows` to direct slice.
- Passes `tsc --noEmit --noUnusedLocals` with zero errors.

### Verified
- TypeScript compilation: ✅
- Zero `--noUnusedLocals` errors.

---

## Batch 62 — Rich Credits Toast & Pluralization

### UX Enhancement
- Rich credits toast: interactive Sileo toast with progress bar, percentage remaining, credits used, plan tier.
- Theme-aware for both light and dark mode using hardcoded fill colors.
- Pluralization fixes: "1 memories" → "1 memory", "1 schedules" → "1 schedule", "1 teams" → "1 team".

---

## Batch 63 — Tool Name Humanization Consolidation

### Code Quality
- Created `lib/toolLabels.ts` with shared TOOL_LABELS map and humanizeToolName().
- Consolidated from 6 consumers: FeedItem, ApprovalGate, FeedToolCall, FeedTaskGroup, SkillDetailPanel, ChatPrimitives.
- Removed ~35 lines of duplicated code.

---

## Batch 64 — File Utilities, useMemo, Type Safety

### Code Quality & Performance
- Created `lib/fileUtils.ts` with getFileName, getFileExtension, guessLanguage, isImageExtension.
- Consolidated 7 duplicated file path/extension patterns across 5 files.
- Wrapped ModelDropdown options in useMemo (was IIFE recalculating every render).
- Eliminated all `as any` casts: IconButton uses typed ActionIconIcon, toast.ts uses Window interface extension.
- Zero `as any` casts remain in the entire codebase.

### UX Enhancement
- Redesigned CitationCard as compact pill component: rounded-full shape, Google favicon API, truncated title, 240px max width.

---

## Batch 65 — Centralized Date/Time Formatting

### Code Quality
- Added formatDateTime, formatDateTimeShort, formatWhen, relativeTimeAgo to lib/time.ts.
- Replaced 5 duplicated local date formatters across 5 files.
- Removed dead `relativeTime` function from files/helpers.ts.
- Consistent date formatting across the entire app.

## Batch 67 — Perplexity-Style Feed: Remove Timeline Rail
- Deleted TimelineMarker.tsx component entirely
- Removed vertical timeline rail and marker dots from TaskFeed
- Removed timeline constants and marker functions from feedHelpers
- Filtered out 'Starting environment…' and 'Environment started' system entries
- Fixed shimmer animation: consistent 2s sweep (was 1.45s with abrupt 72% stop)
- Removed inTimeline prop from FeedItem (icons always show now)
- Net -144 lines

## Batch 68 — Tool Call Timestamps
- Added formatTimeOnly() to lib/time.ts — returns 'HH:MM AM/PM' format
- Passed 'at' timestamp from FeedItem to FeedToolCall
- Display timestamp right-aligned before chevron on completed tool calls
- Matches Perplexity reference: [icon] [label] ... [time] [chevron]

## Batch 69 — Accessibility Improvements
- aria-label on TaskDetail dismiss button
- aria-expanded + aria-label on parallel actions toggle (TaskFeed)
- aria-expanded + aria-label on tool call expand button (FeedToolCall)
- aria-expanded on show more/less toggle (ChatPrimitives)

## Batch 70 — UX Polish
- UserBubble: "Show more/less" for messages > 600 chars
- TaskStartInput: Replace inline style with Tailwind bg-primary text-surface
- Credits toast: Only show progress bar when usage data exists (fixes 100% bug)
- Cleaned up completed items from user_additions.md

## Batch 71 — Deep Audit + Unused Variable Cleanup
- Visual audit of all pages in light/dark/mobile modes — no regressions
- Prefixed 6 unused variables for strict --noUnusedLocals compliance
- CommandPalette, ConnectorsPage, OnboardingModal, TaskFeed

## Batch 72 — Expandable Thinking Content
- Store thinking text from orchestrator_thinking SSE events (was discarded)
- Add thinkingText to WorkflowStreamState
- ThinkingIndicator: clickable chevron expands to show thinking with Markdown
- Auto-clear thinkingText when transitioning to non-thinking events
- Scrollable container (max-h-64) for long thinking content

## Batch 73 — Quick UX Wins
- Persist selected model to localStorage (restored on reload)
- Enable copy button on bash command output (was disabled)
- Add aria-label to FilesPage and SkillsPage search inputs
- ModelDropdown: show error toast on model fetch failure (was silent)

## Batch 74 — Chat View Modernization
- Removed Timeline component (vertical line + dots) from ChatPrimitives
- Split MessageBubble into UserBubble (warm bg, right-aligned) and AssistantMessage (plain Markdown)
- Created flat MessageList component replacing Timeline
- Fixed gradient truncation bug and StreamingIndicator margin
- Added aria-label to all IconButton instances via label prop

## Batch 75 — Skeleton Loaders + Hover Polish
- Created SkeletonCard component for grid loading states
- SkillGrid: shows 4 skeleton cards while loading
- SkillGrid + KnowledgeSection: hover lift effect on cards (shadow-sm + translate)

## Batch 76 — Chat Header Refinement
- ChatHeader: added variant prop ('modal' | 'fullscreen')
- Fullscreen mode: ArrowLeft back button instead of X close
- Moved close/back button to left side for natural navigation

## Batch 77 — Accessibility + Chat Empty State
- Chat: polished empty state (icon, heading, description)
- KnowledgeSection: aria-label on file upload inputs
- TaskFilesSection: aria-label on workflow selector
- ClarificationPanel: aria-label on custom response input
- App: role='main' on root content wrapper

## Batch 78 — Visual Polish
- Focus-within border/shadow on landing input, TaskStartInput, ChatInput
- ConnectorsTab: fixed hover border (border-border) + lift effect
- Settings nav: shadow-xs on active item for visual weight
- Consistent transition-all on interactive containers

## Batch 79 — Notifications Wiring + Chat Shortcut + Knowledge Skeletons
- TaskDetail: emit notifications on workflow complete/fail (live transitions only)
- ⌘+Shift+C keyboard shortcut toggles chat panel
- KeyboardShortcuts overlay: added toggle chat entry
- KnowledgeSection: shows 4 SkeletonCard while documents load

## Batch 80 — Critical API Fixes (QUALITY_BACKLOG)
- [P1] Bash approvals: new approveBashCommand() API → /bash-approve endpoint
  with approval_id + 'approve'/'deny' decision (was using wrong task approval endpoint)
- [P2] getPendingApprovals: fixed endpoint /pending-approvals and response normalization
- [P1] Removed non-functional pause button (backend has no /pause route)
- Added handleBashApproval callback through full component chain
- Deep audit at batch 80: all pages verified in dark/light/mobile — no regressions
- Notification system confirmed working (was user-reported as broken)
