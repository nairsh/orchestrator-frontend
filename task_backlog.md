# Task Backlog — Relay Pro Frontend

## Status Legend

- 🟡 `todo` — not started
- 🔵 `in_progress` — actively being worked on
- 🟢 `done` — completed and verified
- 🔴 `blocked` — cannot proceed
- ⚠️ `escalated` — requires human design decision
- ↩️ `reverted` — change was reverted (regression)

---

## Epic A — Lobe UI Adoption & Component Standardization

### A1 — Button System Standardization

| Task | Status | Risk | Impact |
|------|--------|------|--------|
| Audit all raw `<button>` elements not using Button/IconButton | 🟢 done | Low | High |
| TaskDetail workflow control buttons → Button component | 🟢 done | Low | High |
| CommandInput send button → IconButton filled | 🟢 done | Low | Medium |
| LandingPage voice button → IconButton | 🟢 done | Low | Low |
| Verify: all interactive elements use correct cursor/focus states | 🟢 done | Low | Medium |

**Verification criteria:** Browser inspection shows consistent hover/focus states, correct disabled styling, no raw bespoke buttons in key flows.

---

### A2 — Loading State Standardization

| Task | Status | Risk | Impact |
|------|--------|------|--------|
| Audit all loading spinners/indicators | 🟢 done | Low | Medium |
| TaskList loading → SkeletonTaskItem | 🟢 done | Low | High |
| FeedItem loading → SkeletonFeedItem | 🟢 done | Low | High |
| Spinner animations consistent (animate-pulse vs animate-spin) | 🟢 done | Low | Medium |

---

### A3 — Search Input Standardization

| Task | Status | Risk | Impact |
|------|--------|------|--------|
| Create SearchInput component | 🟢 done | Low | High |
| Migrate TaskList header search to SearchInput | 🟢 done | Low | High |
| Identify other search surfaces for SearchInput adoption | 🟡 todo | Low | Medium |

---

### A4 — Status Indicator Standardization

| Task | Status | Risk | Impact |
|------|--------|------|--------|
| Create StatusDot component | 🟢 done | Low | Medium |
| Migrate TaskItem to use StatusDot | 🟢 done | Low | Medium |
| Unify paused status color (was text-purple-500) | 🟢 done | Low | Medium |

---

## Epic B — Frontend Architecture Quality

### B1 — God File Elimination

| Task | Status | Risk | Impact |
|------|--------|------|--------|
| Identify god files (>300 lines with mixed concerns) | 🟢 done | Low | High |
| FeedItem.tsx (802L) — extract sub-renderers | 🟢 done | Medium | High |
| ConnectorsPage.tsx (808L) — plan extraction | 🟡 todo | High | Medium |
| FilesPage.tsx (515L) — review | 🟡 todo | Medium | Low |

---

### B2 — Component API Normalization

| Task | Status | Risk | Impact |
|------|--------|------|--------|
| TaskStartInput component exists but duplicated in TaskList | 🟡 todo | Low | Low |
| Avatar component uses inline style for size — normalize to className | 🟡 todo | Low | Low |
| CommandInput textarea — migrate to Textarea primitive | 🟢 done | Low | High |

---

### B3 — Naming & Organization

| Task | Status | Risk | Impact |
|------|--------|------|--------|
| All shared components in correct directories | 🟢 done | Low | Low |
| No one-off styling in page components where tokens apply | 🟢 done | Low | Medium |

---

## Epic C — Design System & Uniform Theme

### C1 — Design Token Completion

| Task | Status | Risk | Impact |
|------|--------|------|--------|
| Sidebar hardcoded colors → CSS variables | 🟢 done | Low | Medium |
| sidebar-accent color added to design token system | 🟢 done | Low | Medium |
| paused status color tokenized | 🟢 done | Low | Low |
| sidebar-sep Tailwind class added | 🟢 done | Low | Low |

---

### C2 — Design System Documentation

| Task | Status | Risk | Impact |
|------|--------|------|--------|
| design_system.md created | 🟢 done | Low | High |
| component_inventory.md created | 🟢 done | Low | High |
| theme_migration_plan.md created | 🟢 done | Low | High |

---

### C3 — Theme Consistency Verification

| Task | Status | Risk | Impact |
|------|--------|------|--------|
| All major pages use consistent spacing | 🟢 done | Low | High |
| Font class usage consistent (font-sans, font-display) | 🟢 done | Low | High |
| Shadow usage consistent (shadow-dropdown for menus, shadow-modal for modals) | 🟢 done | Low | Medium |
| Border radius consistent across similar surfaces | 🟢 done | Low | Medium |

---

## Epic D — Post-Task LobeHub Discovery Pass

| Task | Status | Risk | Impact |
|------|--------|------|--------|
| Review @lobehub/icons package (installed, unused) | 🟢 done | Low | High |
| Evaluate LobeHub UI library adoption | 🟢 done | Low | Medium |
| Document discovery findings in theme_migration_plan.md | 🟢 done | Low | Low |

---

## Backlog Items — Not In Scope / Future

| Item | Reason for Deferral |
|------|---------------------|
| ConnectorsPage god file split | High risk, requires backend knowledge, defer |
| Tooltip component | Manual tooltips work, library Tooltip adds dependency weight |
| Full LobeHub UI adoption | No `@lobehub/ui` in package.json; would require major dependency add |
| React Router / URL routing | Not currently needed; state-driven nav works fine |
| E2E test suite | Out of scope for frontend polish sprint |
