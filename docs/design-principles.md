# Vastu Design System — Design Principles

> Version 0.1 · March 2026 · Living document
> These principles guide every design and engineering decision. When two options feel equally valid, pick the one that better serves these principles.

---

## 01. Everything is addressable

Every piece of data, every view, every state in Vastu has a stable reference. If you can see it, you can link to it, share it, or reach it programmatically.

- Any mention of another entity or page in the UI must be a navigable link — never plain text. "Go to Settings" links to `/settings`.
- Every view state is serializable into a URL. Filters, sort order, column selection, scroll position — shareable by pasting a link.
- Records, views, pages, and panels all have stable IDs exposed via MCP. What a user can click, an agent can call.
- Breadcrumbs, back-links, and ‹/› navigation make the graph of connections traversable, not just present.

---

## 02. Every surface is interactive

Data isn't just displayed — it's a starting point for action. Right-click any data point and the most relevant next steps are right there.

- Right-click context menus on every data element: cells, badges, chart segments, timeline events. Actions: filter by, copy, open detail, ask agent.
- Left-click follows the primary action (navigate, select). Right-click exposes the secondary actions without leaving context.
- Keyboard equivalents for all context actions — no mouse-only workflows. Arrow keys, Enter, Escape, and shortcut hints in menus.
- Double-click for inline edit where applicable. Single-click never triggers an edit — always a navigation or selection.

---

## 03. Data is sacred

Show what the data says, not what looks nice. Never round, truncate, reformat, or recolor data values unless the user or builder has explicitly configured it.

- Raw values are the default. No automatic currency formatting, date localization, or number rounding unless a display type is set in builder config.
- Null is not zero. Empty is not "N/A". Missing data gets its own visual state — a dash (—) with a distinct tertiary color — never a fabricated placeholder.
- Sorting and filtering operate on the underlying value, not the display format. A currency column sorts numerically, not alphabetically.
- When truncation is necessary (see Principle 08), the full raw value is always accessible — never destroyed.

---

## 04. Configure, don't code

Every visual behavior of a chart, table, or component is controlled by a knob — not by editing source. But not all knobs need to be visible at once.

- All configurable properties are exposed in builder mode. Chart color, axis scale, number format, column width, label position — nothing is hardcoded.
- Split knobs into **basic** (visible by default: data source, chart type, color scheme) and **advanced** (collapsed: axis min/max, tick interval, custom formatters, animation duration).
- Every knob has a sensible default. A chart should look good with zero configuration. Knobs refine — they don't initialize.
- Config is runtime, not deploy-time. Changes in builder mode take effect immediately — no code push, no restart.

---

## 05. Speed is a feature

Enterprise users live in this app 8 hours a day. Every interaction must feel instant. If it can't be instant, it must feel responsive.

- Target: <100ms for UI response (click feedback, filter pill appears), <500ms for data operations (query returns, view loads), <2s for complex operations (full page load, agent workflow start).
- Optimistic updates everywhere. When a user saves a view, the UI reflects the change immediately — rollback on server error, not block on server success.
- Skeleton loading states for every data-dependent region. Never show a blank panel — always show the shape of what's coming.
- Virtualize all lists and tables over 50 rows. Never render 1,000 DOM nodes for a scrollable list.
- Prefetch adjacent data: next page of pagination, likely drill-down targets, frequently visited pages.

---

## 06. Never leave the user guessing

The system's state must be visible at all times. If something is loading, say so. If a filter is applied, show it. If an error occurred, explain it.

- Every async operation has three explicit states: **loading** (skeleton or spinner with label), **success** (brief confirmation), **error** (actionable message with retry).
- Active filters, sorts, and modifications are always visible in the view toolbar — never hidden behind a menu. The "Modified" indicator makes unsaved state obvious.
- Progress indicators for operations over 2s. Determinate bars when possible ("3 of 12 records updated"), indeterminate spinners when not.
- Connection state (DB health), agent status (running/idle/error), and background job status are surfaced in the UI, not buried in logs.
- Toast notifications for system events. Non-blocking, auto-dismiss after 5s, with an action button where relevant (e.g., "View" on "Export complete").

---

## 07. Motion with purpose

Animations exist to orient the user — showing where something came from and where it went. Never for decoration, never jarring, always interruptible.

- Layout changes use shared transition hooks: panel resize (200ms ease-out), drawer slide (250ms ease-in-out), tray minimize (180ms ease-out). Reusable, consistent, testable.
- No layout jumps. Content reflow is animated. When a filter reduces rows from 50 to 12, the table height transitions smoothly — it doesn't snap.
- Respect `prefers-reduced-motion`. All animations are wrapped and disabled when the OS setting is on.
- Interruption is graceful. If a panel is mid-transition and the user clicks elsewhere, the animation completes to its target state immediately — no rubber-banding, no stuck states.
- Maximum animation duration: 300ms for micro-interactions, 500ms for layout transitions. Nothing longer — users notice delays past 500ms.

---

## 08. Density without clutter

Show as much data as possible without overwhelming. Truncation, progressive disclosure, and smart defaults make density manageable.

- Auto text truncation is a **system-level behavior**, not per-component. Every text element with a max-width gets ellipsis truncation + full value tooltip on hover. One utility, used everywhere.
- Tables default to comfortable density (32px rows). Users can toggle to compact (24px) or spacious (40px) via density control.
- Summary strips, KPI cards, and sparklines give the "shape" of data at a glance. Full detail is one click away in a drill-down — never force the user to open a detail view to answer "is this number up or down?"
- Empty states are informative, not decorative. Show what the user can do to populate the area — "No views saved yet. Save your current filters as a view." — not a generic illustration.

---

## 09. Agent-native, not agent-bolted

Every user interaction has an MCP equivalent. The UI and agents share the same API surface — agents are first-class users of the system, not screen-scrapers.

- **MCP-first**: every CRUD operation, navigation action, view state change, and config modification is exposed as an MCP tool call. Agents never need browser automation.
- Page state is readable and writable via MCP. An agent can query "what filters are currently applied?" and "apply filter status=pending" without touching the DOM.
- User interactions produce MCP-equivalent events. Clicking "filter by shipped" emits the same state change as an agent calling the filter tool. The system doesn't distinguish the source.
- Agent-generated UI (A2UI) renders within the same component system. Agent output isn't a special iframe — it uses the same cards, tables, and charts as human-authored pages.
- MCP tools are documented alongside UI components. When a developer adds a new page template, they also add the corresponding MCP tools — it's one feature, not two.

---

## 10. Safe to explore

Users should never fear clicking something. Every action is reversible, every destructive operation has a gate, and the system catches mistakes before they matter.

- Undo for all non-destructive operations: filter changes, view edits, record modifications, column reordering. Ctrl+Z works everywhere in the workspace.
- Destructive operations require explicit confirmation with a description of impact: "Delete Order #4521. This will also remove 12 line items. This cannot be undone."
- Soft-delete by default. Records go to a recoverable archive for 30 days before permanent deletion. Hard-delete is admin-only.
- Validation happens inline and early — not on submit. Field errors appear as soon as focus leaves an invalid input, not after the user fills 12 fields and clicks Save.
- Audit trail on everything. Every mutation is logged with who, what, when, and the before/after diff. Users can see exactly what changed and when.

---

## 11. Accessible by default

WCAG 2.2 AA is the floor, not the ceiling. The app works with screen readers, keyboard-only navigation, and high-contrast modes without special configuration.

- Every interactive element is reachable and operable via keyboard. Tab order follows visual reading order. Focus rings are always visible on keyboard navigation.
- Color is never the only signifier. Status badges use color + text label. Chart series use color + pattern (dashed lines, different shapes). Error states use color + icon + message.
- All images, icons, and charts have ARIA labels or are marked decorative. Data visualizations have an accessible text summary fallback.
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text and UI components. Tested in both light and dark themes.
- Mantine's built-in accessibility (focus trap, ARIA attributes, keyboard handlers) is preserved — never overridden by custom components.

---

## Quick reference: guideline → principle mapping

| Guideline | Principle(s) |
|-----------|-------------|
| Interlinked data (always link to referenced UI) | 01 Everything is addressable |
| Right-click friendly | 02 Every surface is interactive |
| Data shown as-is, no formatting without config | 03 Data is sacred |
| Settings as knobs (basic/advanced) | 04 Configure, don't code |
| Speed and smoothness | 05 Speed is a feature |
| Always communicate state | 06 Never leave the user guessing |
| No jarring layout changes, reusable animation hooks | 07 Motion with purpose |
| Auto text truncation with tooltip | 08 Density without clutter |
| MCP-first architecture | 09 Agent-native, not agent-bolted |
| Undo, soft-delete, audit trails | 10 Safe to explore |
| WCAG 2.2 AA, keyboard, screen readers | 11 Accessible by default |
