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

## Batch 81 — Notification Navigation + Command Palette
- NotificationCenter: clicking a notification dispatches relay:select-workflow event
- TasksPage: listens for relay:select-workflow to navigate to specific workflow
- NotificationCenter: marks notification as read on click
- Command Palette: clicking recent task navigates to it

## Batch 82 — Mobile Task Readability + Visual Polish
- TaskItem: 2-line layout on mobile (title above snippet)
- Truncation: objective max 50 chars, snippet max 80 chars
- Time column: relative time (e.g., "3h ago") for compact display
- Sidebar recents: improved truncation with ellipsis

## Batch 83 — Command Palette Enhancements
- Added "Toggle Chat" action dispatching relay:toggle-chat event
- Keyboard shortcut hints (⌘⇧C, ⌘⇧O, etc.) displayed on items
- Real workflows lazy-loaded via useWorkflows when palette is open
- Status-aware icons: CheckCircle2 (green), AlertCircle (red), Clock

## Batch 84 — Error Boundaries + Landing Page Suggestions
- Enhanced ErrorBoundary with inline variant, label prop, retry button
- Wrapped LandingPage, SettingsPage, TasksPage with inline error boundaries
- Expanded suggestion pool: 15 prompts across 5 emoji-prefixed categories
- Random category selection per session for variety

## Batch 85 — Chat Persistence, P1 Bug Fixes, Keyboard A11y
- Chat: sessionStorage persistence (last 50 messages), full conversation history sent
- Chat: "New chat" button (RotateCcw) in header when messages exist
- P1: SSE stream wedge — synthetic 'done' event on EOF
- P1: Failed follow-up rollback — revert optimistic state on sendMessage failure
- P1: Duplicate workflow creation — await onSubmit promise instead of 1s timeout
- P2: TaskItem keyboard accessibility (role=button, tabIndex, Enter/Space)
- P2: Memoized runtimeConfig to prevent refetch churn
- P2: Workflow list errors displayed with retry button
- Responsive padding for TaskDetail and CommandInput on mobile

## Batch 86 — Notification Context, Hydration Error Handling
- P1: Hydration errors no longer silently swallowed in useWorkflowStream
- P2: Notifications shared via React Context (NotificationProvider)
- P2: False notifications on historical tasks eliminated (hydrated flag)
- P3: Settings model-load errors now visible in both panels
- P3: Removed dead FullPageChat component (79 lines)
- P3: Added font-display: swap to external Styrene font faces

## Batch 87 — Chat Avatars & Timestamps, Credits Toast Fix
- Chat: Bot avatar icon for assistant messages, User avatar for user messages
- Chat: Timestamps (HH:MM) on all messages
- Chat: Bot avatar on streaming "Thinking…" indicator
- Credits toast: prevent misleading 100% (capped at 99% when usage exists)
- No progress bar shown when periodCreditsUsed is 0

## Batch 88 — Chat UX Polish, Backdrop Blur, Accessibility Audit Fixes
- Chat: Stop generating button (red square) replaces send during streaming
- Chat: Inline error messages appear as red cards in chat (not just toasts)
- Chat: Suggestion chips in empty state (4 clickable prompts)
- Chat: Input autofocus on modal open, Enter/Shift+Enter hint below input
- Chat: ARIA role=log and aria-live=polite, user avatar contrast fix
- Modal: backdrop-blur-sm on all 7 modal overlays
- OnboardingModal: animate-scale-in entry animation
- P1: ClarificationPanel catches + toasts errors on submit
- P1: KnowledgeSection keyboard a11y (role=button, tabIndex, Enter/Space)
- P2: TaskDetail green "Completed" badge, TaskContextMenu Pin/Unpin toggle
- P3: RenameTaskModal Enter to submit, FeedTaskGroup aria-expanded, SidebarNav aria-current

## Batch 89 — Performance Fixes, Code Dedup, First-Run Empty State
- FeedToolCall: memoize asRecord() to fix defeated useMemo dependency arrays
- TasksPage: debounce resize handler (150ms), first-run empty state with CTA
- NotificationCenter: removed dead useClickOutside hook call
- FeedItem: extracted shared MarkdownWithCitations component

## Batch 90 — Accessibility + OAuth Auto-Refresh
- DropdownMenu: arrow key navigation (Up/Down/Home/End), Escape to close, auto-focus
- Modal: ariaTitle prop with sr-only span + aria-labelledby for screen readers
- ConnectorsTab: OAuth popup auto-close detection with auto-refresh

## Batch 91 — Bug Fixes, Sileo Toast Overhaul, UX Improvements
- Fix: Chat abort properly resets streaming state, preserves partial content
- Fix: Chat input only cleared on successful send (prevents message loss)
- Fix: Knowledge docs loading state tracked properly (no false empty flash)
- Fix: File preview race condition — stale requests ignored via request ID
- Fix: Knowledge file re-upload works (reset input value after selection)
- Fix: TaskContextMenu visible on keyboard focus (group-focus-within)
- Refactor: toastCredits() and toastRich() helpers, amber color for 20-50%
- Removed non-functional PlusDropdown from CommandInput follow-up mode

## Batch 92 — Shared Model Cache + API Deduplication
- getModels() request deduplication — concurrent callers share one request
- 30s TTL cache for model metadata (eliminates redundant API calls)
- invalidateModelsCache() called on preferences save/reset

## Batch 93 — Audit P2 Fixes
- TaskDetail collapse button uses correct handler per view mode
- Task input preserved on failed creation (only cleared on success)
- CommandPalette keyboard scroll targets correct row (data-item-index)
- ChatModal + CommandPalette: role=dialog, aria-modal, aria-label

## Batch 94 — Desktop Notifications
- Desktop notifications for task completion/failure using Notification API
- Permission requested on first user interaction (non-intrusive)
- Only notifies when tab is not focused
- Click notification to focus tab and navigate to workflow

## Batch 95 — Upload Progress + Feed UI Overhaul
- Knowledge upload: per-file progress tracking {done, total}, shows "2/5" counter
- FeedTaskGroup: simplified from heavy cards to clean flat rows (Perplexity style)
- Shimmer animation: fixed dead zone (smooth linear 2.5s sweep)
- Removed unused modelIconOverrides prop threading through FeedItem/TaskFeed

## Batch 96 — File Upload on TaskStartInput
- Wire file upload to TaskStartInput on tasks page (was landing page only)
- Add attachments state + handleUploadFiles to TaskList
- Display file badges with size and remove buttons
- Pass context_files to createWorkflow, clear on success
- Remove misleading "Open a task first" toast

## Batch 97 — P2 Audit Fixes (12 issues)
- useWorkflowStream: restore pre-optimistic state on sendMessage failure
  (paused workflows no longer appear failed on transient errors)
- useWorkflowStream: clear reconnect timer before new connections
- useChatStream: unmount cleanup closes SSE stream
- useChatStream: clearHistory aborts active stream + clears draft
- useChatStream: humanize inline error messages
- toastApiError: uses humanizeError() for all error surfaces
- TaskSearchDialog: role=dialog, aria-modal, combobox/listbox pattern
  with aria-activedescendant for screen reader support
- TaskSearchDialog: show error state on fetch failure (not empty state)
- TaskSearchDialog: guard ArrowDown on empty list
- NotificationCenter: line-clamp-2 instead of truncate for titles
- FeedToolCall: memoize extractTodoDisplay
- Dead code removal: unused imports and props

## Batch 98 — Chat UI Refinement
- Remove avatar circles from all message types (modern LLM chat style)
- User bubble: rounded-br-md speech-bubble shape, no avatar
- Assistant: clean left-aligned text with inline copy + timestamp
- Error: inline icon instead of separate avatar circle
- Disable "New chat" button while streaming
- Add "failed to fetch" to humanizeError patterns

## Batch 99 — Error Humanization + Auto-Scroll Fix
- useWorkflowStream: humanize stream error and hydration failure messages
- useWorkflows: humanize task list fetch errors
- useFilesPageState: humanize file preview error messages
- TaskFeed: auto-scroll triggers on feed ref changes (not just row count)
  so tool output updates scroll into view when user is at bottom

## Batch 100 — Deep Audit P1/P2 Fixes
- P1: Close SSE connection on workflow switch to prevent stale events corrupting next workflow
- P1: Add `hydrated` to notification effect deps so fast-completing tasks don't skip notifications
- P2: Snapshot workflow state from ref for correct optimistic rollback (not inside setState updater)
- P2: SSE done event deduplication — only emit synthetic done if server didn't send one
- P2: Landing page preserves input on submit failure, shows spinner during submission
- P2: Remove double URL.revokeObjectURL in file preview
- P3: Add aria-label to sample prompt buttons

## Batch 101 — Feed UI Refinements + Rich Sileo Toasts
- Changed parallel group icon from Repeat2 to GitFork (rotated -90°) matching reference images
- Added subtle left border to grouped child items in FeedTaskGroup and ParallelToolCalls
- Created toastTaskCreated() — shows truncated objective + model name
- Created toastConnector() — shows connector name with action (connected/disconnected/verified)
- Wired new toasts into useAppState, TaskList, ConnectorsTab, useSettingsState

## Batch 102 — Auth Centralization + Stability Fixes
- Centralize resolveAuthToken: export from api/core.ts, remove duplicates from api/sse.ts and files/helpers.ts
- ModelDropdown: stabilize effect deps to [config.baseUrl, config.hasAuth] preventing unnecessary refetches
- ModelDropdown: add role=group + aria-label to provider sections for screen readers
- ChatPrimitives MessageList: use stable timestamp-based keys instead of array index

## Batch 103 — File Upload Dedup + Files Page Fix
- Extract useFileAttachments() hook consolidating duplicate upload logic from LandingPage + TaskList
- Files page: remove silent 20-workflow truncation, add search filtering for workflows
- Chat autofocus: replace setTimeout(100) hack with useLayoutEffect for instant focus

## Batch 104 — Toast System Upgrade
- Fix credits toast: show 'No usage this period' instead of misleading 100% when no usage data
- Extract themeColors() helper to DRY up color logic across all toast functions
- Add toastSettingsSaved(section) — shows which section was saved
- Add toastUploadComplete(count, totalBytes) — shows upload count and size
- Wire new toasts into SettingsModal, SettingsPage, useSettingsState, useFilesPageState

## Batch 105 — 3 P1 + 3 P2 Fixes from Deep Audit
- P1: Clear reconnect timer on workflow switch cleanup to prevent cross-task SSE pollution
- P1: Treat unexpected stream close as error instead of silently accepting truncated chat responses
- P1: TasksPage syncs selectedId/objective when external navigation changes (notification click)
- P2: useWorkflows returns early with loading=false when auth unavailable (prevents infinite spinner)
- P2: Chat auto-scroll uses 'auto' during streaming to eliminate smooth-animation jank
- P2: Upload toast skips success when 0 documents uploaded (all skipped due to size limits)

## Batch 106 — State Sync Fixes
- useFileAttachments: fix stale closure in handleUploadFiles by using attachmentsRef for budget calculation
- useFilesPageState: sync selectedWorkflowId when initialWorkflowId prop changes externally

## Batch 107 — Chat Abort/Close Split + Accessibility
- Chat abort: add persistPartial param — stop button preserves partial text, closing modal discards it
- Server address input: link label to input with htmlFor/id for screen reader accessibility

## Batch 108 — ChatModal Focus Trap
- Port Tab key focus trapping from shared Modal to ChatModal
- Save/restore focus on mount/unmount

## Batch 109 — Vendor Chunk Splitting
- Split @lobehub/ui and markdown into separate vendor chunks
- Main bundle: 1,979 kB → 498 kB (75% reduction)

## Batch 110 — Status Filter + A11y + Notifications
- TaskList: apply statusFilter to sortedWorkflows (was being ignored)
- TaskList: add role=alert to error section
- NotificationCenter: aria-expanded, aria-haspopup, badge count up to 99+

## Batch 111 — P1/P2 Audit Fixes
- TaskItem: simplify delete toast to always show 'Task deleted'
- TasksPage: wire onRefreshList to all TaskDetail render sites
- TaskFeed: add role=log + aria-live=polite for screen readers
- ClarificationPanel: fix Escape/Cmd+Enter from any focus position

## Batch 112 — A11y Labels + Conversation Export
- Add aria-label to all textarea inputs (TaskStartInput, LandingPage, CommandInput)
- Conversation export: include tool call inputs/outputs with collapsible sections

## Batch 113 — Rich Workflow Toasts + Page Transitions
- Add toastWorkflowComplete/Failed with duration and model info
- Fade-in-soft transition between App screens
- ThinkingIndicator expanded content gets fade animation
- TodoList: smooth status transition colors
- Input component: error/success props with border color + aria-invalid

## Batch 114 — P1/P2 Audit Fixes
- P1: Remove broken ClarificationPanel onDismiss (was noop)
- P1: useWorkflows requestIdRef to prevent stale poll overwrites
- P2: Fix feed auto-scroll jitter (only scroll on new rows)
- P2: CommandPalette combobox a11y (role, aria-controls, aria-activedescendant)
- P2: Rich retry/cancel toasts, BashRenderer auto-expand on error

## Batch 115 — Keyboard A11y
- TaskContextMenu: Arrow key navigation, Escape close, auto-focus
- ResizableDivider: role=separator, Arrow/Home/End keyboard resize
- NotificationCenter: dropdown position clamped to viewport

## Batch 116 — Silent Resume + Scrollable Tool Outputs
- Resume sends 'continue' silently (no user bubble)
- sendMessage opts.silent to suppress user_message in feed
- Tool blocks: increased max height to 500-600px with scroll

## Batch 117 — Remove Duplicate activeModel State
- Removed redundant useState + useEffect sync for activeModel in TasksPage
- Use selectedModel prop directly, eliminating one render cycle flicker

## Batch 118 — File Content Previews in Tool Calls
- file_read: syntax-highlighted content preview (first 80 lines)
- file_edit: shows 'Changes' label with diff/content preview
- file_write: shows 'Written' label with content preview
- Language detection from file extension

## Batch 119 — Reconnect Button for Stale SSE
- ThinkingIndicator: added 'Reconnect' button in stale warning
- retryConnection() resets attempt counter, clears stale, reconnects SSE

## Batch 120 — Scroll-to-Selected Task
- TaskList: scroll selected task into view on navigation
- Uses data-task-id attributes for DOM lookup

## Batch 121 — Copy Objective + Cancel Confirm Escape
- TaskDetail: copy objective to clipboard button
- Cancel confirmation: Escape key dismisses inline

## Batch 122 — Chat Persistence + Partial Response Preservation
- Chat history: sessionStorage → localStorage (survives refresh)
- Automatic migration from sessionStorage
- Modal close: abort(true) preserves partial AI response

## Batches 123-126 — SSE Safety, Optimistic Updates, Performance, UX Polish
- SSE: track terminal events, trigger onError on unexpected EOF
- useWorkflows: clear list on auth loss
- useWorkflowStream: reset pendingEnvironmentSetup on workflow switch
- ClarificationPanel: reset isSubmitting on new clarification
- NotificationCenter: close on click, useLayoutEffect for position
- humanizeError: Firefox/Safari network patterns + SSE disconnect
- Safe optimistic rollback: only remove optimistic entries (preserves SSE events)
- CommandPalette: Tab key focus trap
- Remove dead tool-blocks/ directory (6 files, 355 lines)
- RAF-batched chat streaming: re-renders from ~50/s to ~16/s
- ResizeObserver feed auto-scroll for streaming content
- Pending approvals hydration (survive refresh)
- Mobile-first grids for files, knowledge, connectors
- MemoryTab: action CTA in empty state

## Batch 127 — FilesPage + useWorkflows Race Fix
- Close max-w-6xl wrapper div left unclosed
- useWorkflows: increment requestIdRef on auth loss clear

## Batch 128 — Deep Audit Fixes (A11y, Memory Leaks, Dead Code)
### Accessibility (8 components):
- SkillGrid: Fix nested button → div with role=button
- SkillGrid: aria-label on overflow menu
- SkillDetailPanel: Proper dialog semantics (role=dialog, aria-modal)
- OnboardingModal: Dialog semantics
- ChatModal fullscreen: Dialog semantics + focus trap
- ProviderList: group-focus-within on hover-only actions
- KnowledgeSection: focus-visible on delete button
- ChatPrimitives: group-focus-within on copy button

### Memory Leaks (3):
- useChatStream: Cancel RAF on unmount, reset draftDirtyRef
- useChatStream: Fix stale model closure via modelRef
- ConnectorsTab: Track OAuth poll/timeout in ref, cleanup on unmount

### Dead Code (3 imports):
- ChatPrimitives: unused useEffect
- TaskContextMenu: unused PinOff
- useSettingsState: unused toastSuccess

### UX Polish (4):
- useChatModel: Toast warning on model fetch failure
- TaskDetail: Catch clipboard copy failure
- SettingsRoutingPanel: Fix misleading 'saved automatically' text
- ProviderList: Skeleton loading state

## Batch 129 — Loading States + Billing UX
- TaskListHeader: Spinner in credits pill while loading
- BillingDashboard: Toast warning on partial data failure
- SettingsRoutingInlinePanel: Loading skeleton for preferences
- SettingsIconsInlinePanel: Loading skeleton for model icons
- SchedulesTab: Skeleton cards during initial load
- TeamsTab: Skeleton cards during initial load

## Batch 130 — Performance + A11y + UX Polish
- TaskList: useCallback for onClick/onPin/onRename (preserves TaskItem memo())
- TaskItem: Callback-with-id pattern to eliminate inline closures
- SettingsModal: Pulse skeleton for AI options count while loading
- ProvidersSettingsPanel: Toast when presets fall back to defaults
- TaskSearchDialog: Tab key focus trap
- TeamsTab: Safer key derivation

## Batch 131 — Dead Code Removal + A11y
- Removed dead `pauseWorkflow` API function (no /pause backend endpoint)
- Removed dead `getWorkflowProgress` API function (never imported)
- Removed dead `upsertClarificationToolCall` (53 lines) + unused type import
- ConnectorsTab: safety fallback for unknown providers, aria-label on checkmark, aria-hidden on decorative icons
- FeedTaskGroup: aria-hidden on tool icons, aria-label on status indicators
- WebSearchRenderer/FetchUrlRenderer: aria-hidden on decorative favicons
- CitationCard: aria-hidden on favicon and fallback globe icon

## Batch 132 — Deep Audit 130 Fixes (P0 + P1 + P2/P3)
- **P0**: useWorkflowStream optimistic rollback — match by kind+text from end instead of slice-by-count
- **P1**: useNotifications — wrap localStorage.setItem in try/catch for QuotaExceededError
- **P1**: Modal — wire aria-labelledby to ModalHeader h2 via MODAL_HEADING_ID constant
- **P1**: useAppState — fix stale auth in model-loading effect (depend on runtimeConfig)
- **P1**: useAppState — fix local-mode settings save using effectiveAuth
- **P2**: ClarificationPanel — focus on mount, role=region, aria-label, aria-pressed on options
- **P2**: useWorkflowStream — reset lastEventTimeRef on manual retry
- **P2**: SkillGrid — aria-pressed on selected skill card
- **P2**: ChatPrimitives — add index to message keys to prevent timestamp collisions
- **P3**: FeedToolCall — remove dead 'command' dependency from title useMemo

## Batch 133 — Remaining Audit Fixes
- **P2**: Move pendingEnvironmentSetupRef reads/writes outside setState updaters (concurrency safety)
- **P2**: Replace hard-clipped maxHeight (600/900/1200px) with 'none' when expanded
- **P2**: Use metaRef in useWorkflowMeta so getDisplayName/isPinned/sortKey are stable callbacks
- **P3**: Cancel confirmation stays visible until API call completes (TaskDetail)

## Batch 134 — Unified Empty States + Visual Polish
- Migrated all 5 @lobehub/ui Empty usages to RelayEmpty with contextual icons
- Per-type color coding for feed tool icons (amber=bash, blue=browser, green=file, violet=search, cyan=todo)
- Inline exit code badge in BashRenderer header (green ✓ 0 / red ✗ N)
- vendor-ui chunk reduced ~0.8 kB from dropping Empty import

## Batch 135 — A11y + Timer Cleanup
- OnboardingModal: role=presentation + onKeyDown on overlay backdrop
- SkillDetailPanel: role=presentation + Escape handler on overlay
- Modal: close setTimeout tracked via ref, cleaned up on unmount
- ChatModal: same close timer cleanup pattern

## Batch 136 — Status A11y + Touch Targets
- TaskDetail: role=status + aria-label on Failed/Paused/Completed badges
- TaskDetail: title tooltip on truncated objective
- StatusDot: 20px touch target wrapper with role=img + aria-label

## Batch 137 — Performance + Feed + Chat
- TaskFeed: RAF-throttled scroll listener to prevent jank on long feeds
- TodoList: Loader2 spinner for running tasks, role=list/listitem, stable keys
- Markdown: language regex handles c++, c#, objective-c
- useChatStream: cancel pending RAF on error chunk
- FilesPage: disable knowledge search button when query is empty

## Batch 138 — Utility Safety & A11y Fixes
- useClickOutside: `instanceof Node` guard on e.target (prevents crash on non-Node targets)
- useEscapeKey: `e.preventDefault()` to stop Escape propagation to parent handlers
- time.ts: regex replace `/\s+/` for all whitespace; future date guard returns "just now"
- WorkflowProgress: `role="progressbar"` + `aria-valuenow/min/max` for screen readers
- PlusDropdown: `aria-label="Actions menu"` on menu container

## Batch 139 — UX Polish: Duplicate Button, Loading States
- SettingsModal: removed duplicate "Test connection" button from footer (kept panel one)
- RelayEmpty: added `role="status"` for screen reader announcements
- ThinkingIndicator: `aria-label` on shimmer text for activity context
- WebSearchRenderer: Loader2 spinner while actively searching
- FetchUrlRenderer: Loader2 spinner while fetching URL

## Batch 140 — A11y Semantics: Lists, ARIA-hidden, Describedby
- TaskFeed: `aria-hidden` on collapsed parallel tool content
- NotificationCenter: `role="list"` + `role="listitem"` on notification items
- TaskList: `role="list"` on container, `role="group"` + `aria-label` on time groups, `role="listitem"` on items
- ChatPrimitives: `aria-describedby` linking textarea to keyboard hint text

## Batch 141 — A11y Labels & Landmarks
- TaskItem: `aria-label` on `role="button"` for screen reader context
- FeedTaskGroup: `aria-hidden` on collapsed content div
- Sidebar: `aria-label="Main navigation"` on all 3 aside variants (mobile, collapsed, expanded)
- KnowledgeSection: `aria-label` on document card buttons
- TaskFilesSection: `aria-label` on file card buttons

## Batch 142 — Performance: Memo-wrap Feed Components
- FeedToolCall: wrapped in `React.memo` for stable prop skipping
- BashRenderer: `React.memo`
- WebSearchRenderer: `React.memo`
- FetchUrlRenderer: `React.memo`
- TodoList: `React.memo`
- FeedTaskGroup: `React.memo`
- Reduces unnecessary re-renders during streaming feed updates

## Batch 143 — Audit 140 Fixes: Modal, ChatModal, BashRenderer, Submit Guard
- Modal: per-instance heading ID via `useId()` + context (fixes shared static ID collision)
- ChatModal: added `aria-modal="true"` on fullscreen dialog
- BashRenderer: auto-expand output when command finishes with non-zero exit code
- LandingPage: synchronous ref guard prevents double-submit race
- ProviderList: removed unused `Loader2` import

## Batch 144 — Cache Key, Refresh State
- models.ts: include auth presence in cache key (prevents stale user data on sign-in/out)
- useWorkflows: added `refreshing` state so manual refreshes show UI feedback

## Batch 145 — Keyboard Nav: DropdownMenu + SidebarAccount
- DropdownMenu: triggerRef for focus restoration on close, aria-hidden when closed
- SidebarAccount: full keyboard nav (ArrowDown/Up/Home/End/Escape), focus-first-on-open, aria-hidden

## Batch 146 — PlusDropdown Keyboard Nav, BillingDashboard Dep, Dead Prop Cleanup
- PlusDropdown: full keyboard nav (ArrowDown/Up/Home/End/Escape), triggerRef, focus-first-on-open
- BillingDashboard: fixed stale useEffect dependency (config.baseUrl → config)
- FeedItem: removed unused `onApproval` prop from interface + destructure
- TaskFeed: stopped passing dead `onApproval` to FeedItem

## Batch 147 — Per-Provider OAuth Timers, ProviderDialog Label A11y
- ConnectorsTab: per-provider OAuth timers (Record instead of shared object)
- ProviderDialog: added htmlFor + id on all 5 form labels

## Batch 148 — Favicon/Image Error Fallbacks
- WebSearchRenderer: Globe icon fallback on favicon load error
- FetchUrlRenderer: Globe icon fallback on favicon load error
- LandingPage: onError handler hides broken attachment images

## Batch 149 — Lazy-Load Modals, Remove Redundant SSE Cleanup
- AppModals: React.lazy() + Suspense for all 5 modals (SettingsModal, CommandPalette, TaskSearchDialog, KeyboardShortcutsOverlay, OnboardingModal) — reduces initial bundle
- useWorkflowStream: removed redundant unmount cleanup (duplicated existing cleanup)

## Batch 150 — TaskDetail Export/Cancel Fixes, Dead Prop Cleanup
- TaskDetail: export/download wrapped in try-catch with toastApiError
- TaskDetail: cancel confirmation gets role="alert", Escape handler with stopPropagation
- TaskDetail: removed unused modelIconOverrides prop + import
- TasksPage: removed 7 modelIconOverrides passes to TaskDetail

## Batch 151 — Deep Audit 150: All 7 Findings Fixed (2 P1, 4 P2, 1 P3)
- P1: chat history scoped by server+auth in localStorage (prevent cross-leak)
- P1: ClarificationPanel honors allowCustom flag from server
- P2: trace fetch failure no longer crashes workflow hydration (independent catch)
- P2: invalidateModelsCache uses correct key format (ApiConfig instead of raw baseUrl)
- P2: file preview race — re-check requestId after async blob/text read
- P2: stop leaking URLs to Google favicon API — use origin/favicon.ico
- P3: clear OAuth timeout timer on popup close (not just poll interval)

## Batch 152 — A11y + UX Polish
- Avatar: add role="img" + aria-label for screen readers
- LandingPage: broken attachment images now show FileText icon via React state
- LandingPage: focus-visible outlines on remove-attachment + sample prompt buttons

## Batch 153 — SegmentedControl A11y, ThinkingIndicator Memo, Dedup
- SegmentedControl: role=radiogroup + role=radio + aria-checked
- ThinkingIndicator: wrapped in React.memo to prevent feed re-render thrashing
- FetchUrlRenderer: reset faviconError state when source URL changes
- TaskDetail: deduplicated 3x objective truncation into single truncatedObj

## Batch 154 — Modal Focus Trap Improvements
- Modal: consolidated focusable selector into single constant
- Modal: exclude disabled buttons/inputs/selects/textareas from focus trap
