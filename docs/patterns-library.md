# Vastu Design System — Patterns Library

> Version 0.1 · March 2026 · Living document
> Companion to: Design Principles, Style Guide, Wireframes (Groups A–F)
> Each pattern references the principles it implements.

---

## Table of contents

1. Data tables
2. Filters
3. Charts and data visualization
4. Drawer-to-panel promotion
5. Right-click context menus
6. Loading state choreography
7. Text truncation system
8. Empty states
9. Form patterns
10. Toast and notification patterns
11. Keyboard navigation
12. Panel and window management

---

## 1. Data tables

The primary interaction surface in Vastu. Users spend ~80% of their time in tables. Every decision here compounds.

*Implements: P01 (addressable), P02 (interactive), P03 (data sacred), P05 (speed), P08 (density), P09 (agent-native)*

### 1.1 Search

Every table has two search tiers, both always visible:

**Global text search** — A single input above the table that searches across all visible text columns. Debounced at 300ms. Highlights matching fragments in cells. Emits a view state change (serializable, MCP-callable). Clearing the search input restores the previous state.

**Per-column search** — Accessible via the column header dropdown (click the column name or filter icon). Opens a small popover scoped to that column's data type. Text columns get a text input with IER mode selector (see Filters section). Numeric columns get a min/max range. Date columns get a date range picker. Active per-column filters show a small dot on the column header.

Both tiers compose — global search AND per-column filters apply simultaneously as AND conditions.

### 1.2 Right-click value filtering

Right-clicking any cell value in the table opens the context menu with filter actions specific to that value:

- **Include this value** — adds an include filter for the clicked value on that column
- **Exclude this value** — adds an exclude filter
- **Filter to only this value** — replaces all filters on that column with include-only for this value
- **Copy value** — copies the raw (unformatted) value
- **Open detail** — opens the record drawer for that row

For multi-select scenarios (user has selected multiple rows), the context menu operates on all selected values: "Include these 5 values" / "Exclude these 5 values."

### 1.3 Pagination

Server-side pagination is the default for all tables connected to a database source. The pagination bar includes:

- Current range display: "Showing 1–25 of 1,203 results"
- Rows-per-page selector: dropdown with options 10, 25, 50, 100
- Page navigation: ‹ 1 2 3 … 49 › with active page highlighted
- Jump-to-page: click page count to type a specific page number

The current page, rows-per-page, and total count are part of the serializable view state and exposed via MCP.

For tables under 500 rows with no server-side source, client-side pagination is used with the same UI.

### 1.4 Batch actions

When one or more rows are selected via checkboxes, a batch action bar appears between the filter bar and the table header (pushing content down, not overlaying it — per Principle 07).

The bar contains:
- Selection count: "N selected" (clickable to select/deselect all)
- Action buttons: Export, Bulk edit, Assign to, Delete (destructive actions use red text)
- "Select all N,NNN" link — selects all rows matching current filters, not just the visible page
- "Clear" link — deselects all

Batch actions trigger confirmation dialogs (see Patterns §10) and are exposed as MCP tools.

### 1.5 Column configuration

Every table supports column manipulation:

**Resize** — Drag the column header border. Double-click the border to auto-fit the column to its widest content (header or cell, whichever is larger). A "Reset column widths" option is available in the table options menu.

**Reorder** — Drag a column header to a new position. Drop indicator shows the target position. Column order is part of the view state.

**Visibility** — Column picker button in the toolbar opens a checklist of all available columns. Unchecked columns are hidden. At least one column must remain visible.

**Auto-resize options** (table options menu ⋯):
- "Fit all columns to content" — resizes every column to its widest cell
- "Fit all columns to view" — distributes available width evenly across visible columns
- "Reset to default" — restores builder-configured column widths

All column state (widths, order, visibility) is serialized into the view and restored when the view is loaded.

### 1.6 Sorting

Click a column header to sort ascending. Click again for descending. Click a third time to remove sort. Multi-column sort: hold Shift and click additional columns — sort indicators show priority numbers (1↑, 2↓).

Sort state is part of the view. Sorting is server-side for paginated tables.

### 1.7 Row density

Three density levels controlled by a toggle in the toolbar:

| Density | Row height | Best for |
|---------|-----------|----------|
| Compact | 24px | Scanning large datasets, power users |
| Comfortable | 32px | Default, balanced readability |
| Spacious | 40px | Presentations, fewer rows, readability-first |

Density preference is stored per-user (not per-view) and applied globally across all tables.

### 1.8 Cell rendering

Cells render based on the display type configured in builder mode:

| Display type | Rendering | Sort behavior |
|-------------|-----------|---------------|
| Text | Raw text, truncated with tooltip | Alphabetical |
| Number | Raw number (no formatting unless configured) | Numeric |
| Currency | Symbol + number (format from config: $, €, ₹) | Numeric |
| Date | Raw ISO string unless date format configured | Chronological |
| Relative date | "2h ago", "3d ago" with absolute date in tooltip | Chronological |
| Badge | Colored pill with text (color map from builder config) | Alphabetical |
| Avatar | Initials circle + name | Alphabetical by name |
| Boolean | Check icon (true) or dash (false) | true-first |
| Link | Blue text, clickable, opens in drawer or panel | Alphabetical |
| Monospace | Monospaced font (IDs, codes, hashes) | Alphabetical |

Null/empty values always render as "—" in `--v-text-tertiary` color and sort last regardless of sort direction.

### 1.9 MCP surface

Every table interaction has an MCP equivalent:

| User action | MCP tool |
|-------------|----------|
| Apply global search | `table.search(query)` |
| Add column filter | `table.filter.add(column, mode, value)` |
| Change sort | `table.sort(column, direction)` |
| Change page | `table.paginate(page, pageSize)` |
| Select rows | `table.select(rowIds)` |
| Execute batch action | `table.batch(action, rowIds)` |
| Read current state | `table.getState()` → returns filters, sort, page, selected |

---

## 2. Filters

Filters are a first-class system, not per-component implementations. The same filter engine powers table column filters, view-level filter pills, data explorer controls, and chart filters.

*Implements: P01 (addressable), P02 (interactive), P03 (data sacred), P04 (configure don't code), P09 (agent-native)*

### 2.1 Filter modes (IER)

Every filter supports three modes, toggled via a small dropdown at the left of the filter input:

| Mode | Symbol | Behavior |
|------|--------|----------|
| **Include** | `I` | Show only rows matching the value(s). Default mode. |
| **Exclude** | `E` | Hide rows matching the value(s). |
| **Regex** | `R` | Match rows against a regular expression pattern. |

Mode selection persists per-filter and is part of the serialized view state.

### 2.2 Filter input by data type

The filter input adapts to the column/dimension data type:

| Data type | Filter input | IER behavior |
|-----------|-------------|--------------|
| **String/text** | Multi-value tag input (type to search, click to add) | I: show matching, E: hide matching, R: regex against string |
| **Enum/categorical** | Checkbox list of all unique values (with counts) | I: checked = show, E: checked = hide, R: regex against value labels |
| **Number** | Dual-handle range slider + min/max number inputs | I: within range, E: outside range, R: not applicable (disabled) |
| **Currency** | Same as number with currency symbol prefix | Same as number |
| **Date/datetime** | Date range picker with presets (Today, Last 7d, Last 30d, This month, This quarter, Custom range) | I: within range, E: outside range, R: not applicable |
| **Boolean** | Three-state toggle: True / False / Any | I/E swap meaning, R: not applicable |

### 2.3 Filter pills

Active filters appear as pills in the filter bar below the search input. Each pill shows:

- Column/dimension name (truncated if needed)
- Mode indicator: `I` `E` or `R` (color-coded: I=blue, E=red, R=purple)
- Value summary (truncated): "Shipped, Pending" or "≥ $1,000" or "Mar 1 – Mar 17"
- Count of matching rows (optional, shown if server supports it)
- × button to remove the filter
- Click the pill to edit in a popover

Pills are horizontally scrollable if they overflow. A "+ Add filter" button at the end opens the dimension picker.

### 2.4 Composite filters (advanced)

For power users and complex queries, the filter bar has an "Advanced" toggle that switches from pill mode to a structured filter builder:

```
┌──────────────────────────────────────────────────────┐
│  WHERE                                                │
│  ┌─ Group (AND) ─────────────────────────────────┐   │
│  │  Status [Include] = Shipped, Pending           │   │
│  │  Region [Include] = US West                    │   │
│  │  ┌─ Group (OR) ──────────────────────────┐    │   │
│  │  │  Total [Include] ≥ $5,000              │    │   │
│  │  │  Priority [Include] = High             │    │   │
│  │  └────────────────────────────────────────┘    │   │
│  └────────────────────────────────────────────────┘   │
│  [+ Add condition]  [+ Add group]                     │
└──────────────────────────────────────────────────────┘
```

Structure:
- **Conditions** are individual filters (column + mode + value)
- **Groups** combine conditions with AND or OR connectors
- Groups can be nested to arbitrary depth (though UI discourages more than 3 levels)
- Each group has a connector toggle (AND/OR) at its header
- Drag-and-drop to reorder conditions within and between groups
- "Convert to simple" collapses back to pills if the filter is flat (no OR groups, no nesting)

The composite filter is serialized as a JSON tree and stored as part of the view state. MCP tools accept the same JSON structure:

```typescript
interface FilterNode {
  type: 'condition' | 'group';
  connector?: 'AND' | 'OR';           // groups only
  children?: FilterNode[];             // groups only
  column?: string;                     // conditions only
  mode?: 'include' | 'exclude' | 'regex'; // conditions only
  value?: any;                         // conditions only
}
```

### 2.5 Filter presets

Builder mode allows admins to define filter presets — named filter configurations that appear as quick-access buttons above the filter bar:

- "High priority" → Priority = High AND Status ≠ Cancelled
- "My orders" → Assigned to = {current_user}
- "Overdue" → Due date < today AND Status ≠ Shipped

Presets are read-only for editors. Builders can create, edit, and delete them.

### 2.6 Filter state communication

Active filters are always visible (Principle 06):
- Filter pill bar shows all active simple filters
- A "Filters active (N)" indicator appears in the view toolbar when any filter is applied
- The view "Modified" dot appears when filters differ from the saved view
- Table row count updates to reflect filtered total: "Showing 1–25 of 47 results (1,203 total)"

---

## 3. Charts and data visualization

All charts in Vastu use Recharts and follow a consistent configuration, styling, and interaction model.

*Implements: P03 (data sacred), P04 (configure don't code), P06 (communicate state), P08 (density), P11 (accessible)*

### 3.1 Chart types

| Type | When to use | Series limit |
|------|------------|-------------|
| Line | Trends over time, continuous data | ≤10 series |
| Area | Same as line, emphasizing volume/magnitude | ≤5 series (fill opacity compounds) |
| Bar (vertical) | Categorical comparison | ≤12 categories |
| Bar (horizontal) | Categorical with long labels | ≤20 categories |
| Stacked bar | Part-to-whole within categories | ≤6 segments |
| Donut | Part-to-whole, single dataset | ≤8 segments (group tail into "Other") |
| Sparkline | Inline trend indicator (KPI cards, table cells) | 1 series |
| Heatmap | Two-dimensional intensity | N/A |
| Scatter | Correlation between two measures | ≤5 series |

No pie charts (donuts are strictly better — the center holds summary text). No 3D charts. No radar/spider charts. These add visual complexity without improving data comprehension.

### 3.2 Collapsible config panel

Every chart component has a config panel accessible via a gear icon in the chart header. The panel slides out below the chart header (not a modal — stays in context) and divides into two tiers:

**Basic settings** (visible by default):
- Chart type selector (icon grid)
- Data source / metric picker
- Group by dimension
- Time resolution (if time-axis: hourly, daily, weekly, monthly)
- Color scheme (palette picker: discrete series, sequential, diverging)

**Advanced settings** (collapsed by default, expand via "Show advanced"):
- Y-axis: min, max, scale (linear/log), unit label, number format
- X-axis: min, max, label rotation, tick interval
- Series: per-series color override, line style (solid/dashed/dotted), visibility toggle
- Legend: position (top/bottom/right/hidden), label format
- Grid lines: show/hide horizontal, show/hide vertical
- Annotations: reference lines (target, average, threshold) with label and color
- Animation: on/off, duration
- Export: PNG, SVG, CSV (data only)

All config values are stored in the page configuration (builder-level) with per-view overrides for user-adjustable settings.

### 3.3 Color application rules

**Discrete series:** Use `CHART_SERIES_COLORS` in order. Never skip indices. When fewer series exist, use only the first N colors. When a legend item is toggled off, its color is preserved (the next series doesn't shift to fill the gap).

**Sequential:** Use the appropriate sequential ramp (blue, green, warm) from the style guide. 5 stops, linearly interpolated for intermediate values.

**Diverging:** Use the appropriate diverging ramp (red-blue or red-green). Midpoint at zero or the data mean, configurable in advanced settings.

**Single metric (KPI sparklines, single-bar):** Use `--v-accent-primary` (#2378CB). For positive/negative delta, use `--v-status-success` / `--v-status-error`.

### 3.4 Interaction behaviors

**Hover:** Tooltip appears showing the exact data value(s) at the hovered point. For multi-series, tooltip shows all series values at that x-position, sorted by value descending. Tooltip uses `--v-bg-elevated` background with `--v-shadow-sm`.

**Click:** Clicking a data point or segment triggers a drill-down if configured (builder setting). Default drill-down opens a filtered table view of the underlying records. For donut/bar segments, clicking filters to that segment's value.

**Right-click:** Opens the chart context menu:
- "Filter to this value" — applies filter on the clicked dimension value
- "Exclude this value" — applies exclude filter
- "Drill down" — opens filtered detail view
- "Copy value" — copies the data value
- "Ask agent about this" — sends the data point context to the agent panel

**Legend interaction:** Click a legend item to toggle series visibility. The chart animates the series in/out (Principle 07). Double-click a legend item to solo that series (hide all others). Double-click again to restore all.

**Brush/zoom:** Time-series charts support click-and-drag on the x-axis to zoom into a time range. A "Reset zoom" button appears in the chart header when zoomed. Zoom state is temporary (not saved to view).

### 3.5 Responsive behavior

Charts resize to fill their container width. Height is configurable (default: 240px for inline charts, 360px for full-width explorer charts). On resize, Recharts re-renders with new dimensions — no CSS scaling.

When container width drops below 400px, the chart switches to a simplified view: hide legend (move to tooltip only), reduce axis labels, remove grid lines.

### 3.6 Accessibility

- Every chart has an `aria-label` describing the chart type and data summary: "Line chart showing revenue by region from August 2025 to March 2026"
- An accessible data table fallback is available via a "View as table" toggle in the chart header — same data, rendered as a sortable `VastuTable`
- Color is never the sole differentiator between series. Line charts use distinct dash patterns for the first 5 series (solid, dashed, dotted, dash-dot, long-dash). Bar charts can enable pattern fills as an accessibility option.
- Tooltips are keyboard-accessible: Tab focuses the chart, arrow keys move between data points.

### 3.7 Loading and error states

| State | Rendering |
|-------|-----------|
| Loading (first load) | Skeleton matching chart dimensions — gray rect with subtle pulse |
| Loading (refetch) | Chart stays visible, overlay with subtle spinner + "Updating..." label |
| Empty (no data) | Centered message: "No data matches current filters" with action to adjust filters |
| Error | Error message with retry button: "Failed to load chart data. [Retry]" |

### 3.8 Chart MCP surface

| Action | MCP tool |
|--------|----------|
| Get chart config | `chart.getConfig(chartId)` |
| Update chart config | `chart.setConfig(chartId, config)` |
| Get chart data | `chart.getData(chartId)` → returns the query results |
| Export chart | `chart.export(chartId, format)` |
| Set time range | `chart.setTimeRange(chartId, start, end)` |

---

## 4. Drawer-to-panel promotion

A record opened in a drawer can be promoted to a full Dockview panel for persistent reference while working on other data.

*Implements: P01 (addressable), P05 (speed), P07 (motion)*

### 4.1 Flow

1. User clicks a table row → record drawer slides in from the right (250ms ease-out)
2. Drawer shows record detail with ⬔ button in the header
3. User clicks ⬔ → drawer content morphs into a new Dockview tab:
   - Drawer slides out (200ms)
   - Simultaneously, new tab appears in the tab bar with a brief highlight animation
   - Panel opens with the same content, same scroll position, same active tab
4. The table row that triggered the drawer remains highlighted while the panel is open
5. The promoted panel is now a first-class Dockview citizen: it can be split, floated, minimized to tray, or closed independently

### 4.2 State preservation

When promoting drawer → panel:
- Active tab (Details/Items/History/Notes/Permissions) is preserved
- Scroll position within the active tab is preserved
- Any unsaved edits in form fields are carried over (dirty state transfers)
- The URL updates to include the panel reference

When demoting panel → drawer (⬔ button works in reverse):
- Same state preservation rules apply
- Panel closes, drawer opens at the same position

### 4.3 Animation spec

```
Drawer close:  transform translateX(0 → 100%), 200ms ease-in
Tab appear:    opacity 0 → 1, background highlight flash (accent-primary-light → transparent), 300ms
Panel open:    height 0 → auto, 200ms ease-out
```

All animations respect `prefers-reduced-motion`.

---

## 5. Right-click context menus

Every data surface in Vastu supports right-click for contextual actions. The menu content adapts to what was clicked.

*Implements: P02 (interactive), P09 (agent-native)*

### 5.1 Menu composition

Context menus are assembled from action modules based on the click target:

| Target | Actions |
|--------|---------|
| **Table cell** | Copy value, Include filter, Exclude filter, Filter to only, Open record, Ask agent |
| **Table row** (not on a cell) | Open record, Open in new panel, Edit, Duplicate, Delete, Copy row as JSON |
| **Table header** | Sort ascending, Sort descending, Remove sort, Filter this column, Hide column, Auto-fit width, Reset width |
| **Badge/status** | Include filter, Exclude filter, Copy value |
| **Chart segment** (bar, donut, area) | Filter to value, Exclude value, Drill down, Copy value, Ask agent about this |
| **Chart axis label** | Filter to this period/category, Exclude, Zoom to range |
| **Timeline event** | Open related record, Copy event detail, Filter to event type, Ask agent |
| **Dashboard card** | Edit card, Resize, Remove from dashboard, Open source view, Refresh |
| **Tray item** | Restore panel, Restore as split, Restore as float, Close panel |
| **Sidebar nav item** | Open, Open in new panel, Pin/Unpin, Edit in builder (admin only) |

### 5.2 Structure

Every context menu follows this structure:

1. **Primary actions** — the 2-3 most likely next steps (bold first item)
2. **Separator**
3. **Filter actions** — Include, Exclude, Filter to only
4. **Separator**
5. **Utility actions** — Copy, Export, Open in new panel
6. **Separator** (only if destructive actions follow)
7. **Destructive actions** — Delete, Remove (red text, at the bottom, always)

Keyboard shortcuts are shown right-aligned in the menu where applicable.

### 5.3 Implementation

Use the `VastuContextMenu` wrapper component that:
- Captures `onContextMenu` events on any `[data-context]` element
- Reads `data-context-type` and `data-context-value` attributes to determine menu content
- Positions the menu at cursor coordinates with viewport-edge detection
- Traps focus within the menu, supports arrow key navigation
- Emits the same events as left-click actions (same MCP tool calls)

---

## 6. Loading state choreography

Loading states communicate system activity without blocking the user or causing layout jumps.

*Implements: P05 (speed), P06 (communicate state), P07 (motion)*

### 6.1 State matrix

| Operation | Duration | UI treatment |
|-----------|----------|-------------|
| Instant (<100ms) | Imperceptible | No loading indicator. Optimistic update. |
| Fast (100–500ms) | Noticeable | Subtle: skeleton shimmer or inline spinner next to the action |
| Medium (500ms–2s) | Waiting | Visible: skeleton replaces content region, label appears ("Loading orders...") |
| Slow (2s–10s) | Blocking | Progress: determinate bar if possible ("Exporting 45 of 1,203 records..."), cancel button |
| Background (>10s) | Non-blocking | Toast notification: "Export started. We'll notify you when it's ready." User continues working. |

### 6.2 Skeleton loading

Skeletons match the exact layout of the content they replace:
- Table: skeleton rows with alternating widths to suggest varying data
- Chart: gray rectangle matching chart dimensions
- KPI card: two skeleton lines (label + number)
- Sidebar: skeleton rectangles for nav items
- Drawer: skeleton lines for field labels and values

Skeletons use Mantine's `Skeleton` component with `animate` enabled. They pulse at 1.5s intervals.

### 6.3 Transition rules

- **First load:** Show skeleton immediately. Content fades in over 150ms when data arrives.
- **Refetch (filters changed, page changed):** Keep stale content visible. Overlay a subtle 40% opacity fade. Content swaps with a brief crossfade (100ms) when new data arrives. Never show a full skeleton for refetches — the layout is already known.
- **Error after loading:** Content disappears, error message fades in with a retry button. Never show both stale content and an error.
- **Optimistic update:** UI updates immediately. If the server rejects, revert with a toast error explaining what happened.

### 6.4 Never block navigation

Loading states for one panel never prevent interaction with other panels. If the Orders table is loading, the user can still interact with the sidebar, tray, other panels, and the command palette.

---

## 7. Text truncation system

A single system-level behavior applied everywhere. Not a per-component decision.

*Implements: P03 (data sacred), P08 (density)*

### 7.1 The `TruncatedText` component

Every text element that could exceed its container uses `TruncatedText`:

```tsx
<TruncatedText value="Acme Corporation International Holdings Ltd." maxWidth={200} />
```

Behavior:
- Text is rendered with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- On hover: a `Tooltip` appears after a 300ms delay showing the full untruncated value
- The tooltip uses `--v-bg-elevated` background, `--v-shadow-sm`, `--v-text-sm` font
- Tooltip position is auto-detected (prefer top, fall back to bottom/right if near viewport edge)
- Tooltip max-width: 400px. If the value is still too long for the tooltip, it wraps inside the tooltip.

### 7.2 Where it's applied

- Table cells (all text display types)
- Sidebar nav labels (when collapsed: tooltip shows full page name on icon hover)
- Filter pills (value summary)
- Breadcrumb segments
- Tab labels (if tab bar overflows)
- Badge text
- Tray bar panel names
- View picker view names
- Drawer field values
- Any location where data-driven text meets a fixed-width container

### 7.3 Exceptions (never truncate)

- KPI card primary numbers — if it doesn't fit, the card is too small
- Modal/dialog titles — they control their own width
- Toast notification messages — they auto-size
- Error messages — always show full text, wrap if needed
- Code/monospace values in editors — horizontal scroll instead

---

## 8. Empty states

Empty states are contextual, actionable, and informative. Never generic.

*Implements: P06 (communicate state), P08 (density)*

### 8.1 Structure

Every empty state has three parts:

1. **Icon** — A single Tabler icon at `--v-icon-xl` (32px), `--v-text-tertiary` color. Relates to the content type (table = `IconTable`, chart = `IconChartLine`, search = `IconSearch`).
2. **Message** — One sentence explaining what's empty and why. Uses `--v-text-secondary`.
3. **Action** — A primary button or link that resolves the empty state.

### 8.2 Per-context examples

| Context | Message | Action |
|---------|---------|--------|
| Table with no data | "No orders found. Create your first order or import from CSV." | [+ Create order] [Import CSV] |
| Table with active filters (no results) | "No orders match your current filters." | [Clear all filters] |
| Search with no results | "No results for 'qwerty'. Try a different search term." | [Clear search] |
| Dashboard with no cards | "Your dashboard is empty. Pin views from any page to build it out." | [+ Add card] |
| View picker with no saved views | "No saved views yet. Save your current filters as a view." | [Save current view] |
| Agent panel with no history | "No conversations yet. Ask a question about your data." | (focus the input) |
| Audit log (filtered, no results) | "No events match these filters for the selected date range." | [Reset filters] |
| Timeline with no events | "No activity recorded yet. Events will appear here as actions occur." | (no action — informational) |

### 8.3 Rules

- Never use decorative illustrations (cartoon characters, complex SVGs). A single icon is enough.
- Never say "Nothing here" or "No data" without context. Always explain what the user can do.
- If the empty state is caused by permissions (user can't see data), say so: "You don't have access to view orders. Contact your admin."
- Empty states must be responsive — they center in their container regardless of size.

---

## 9. Form patterns

Consistent form behavior across all input surfaces: settings pages, builder config, record editing, multi-step wizards.

*Implements: P04 (configure don't code), P06 (communicate state), P10 (safe to explore)*

### 9.1 Validation

**Inline, on blur.** Field errors appear as soon as focus leaves an invalid input. The error message appears below the field in `--v-status-error` color. The field border turns `--v-status-error`.

Never validate on keystroke (too aggressive). Never validate only on submit (too late).

**Required fields** show a `*` after the label. Optional fields are not labeled as "(optional)" — the absence of `*` implies optional.

**Server-side validation** errors (e.g., "email already in use") appear in the same position as client-side errors, after the form submission attempt.

### 9.2 Multi-step forms

For forms with more than 6 fields or distinct sections (e.g., "Create order" with Customer → Items → Review):

- Step indicator at the top: numbered circles connected by lines, active step highlighted
- Back/Next buttons in a sticky footer
- Step count: "Step 2 of 3"
- Each step validates before allowing "Next" — errors prevent progression
- Back always works without data loss — form state is preserved
- A "Save draft" option persists partial progress (auto-save every 30s on change)
- The URL updates per step for addressability: `/workspace/orders/new?step=2`

### 9.3 Dirty state

When a form has unsaved changes:
- A "Modified" indicator appears (goldenrod dot, per accent system)
- Navigating away triggers a confirmation: "You have unsaved changes. Discard or keep editing?"
- The discard/save state is available via MCP: `form.getDirtyState(formId)`

### 9.4 Field layout

- Maximum two columns for fields on desktop. Three columns only for very compact settings grids.
- Related fields group together with a section label (`--v-text-lg`, `--v-font-medium`).
- Dropdown selects are searchable when options exceed 8 items.
- Long text fields (notes, descriptions) use auto-expanding textarea.
- Read-only fields use `--v-bg-tertiary` background with no border.

---

## 10. Toast and notification patterns

Non-blocking feedback for system events and user actions.

*Implements: P06 (communicate state), P07 (motion)*

### 10.1 Toast types

| Type | Icon | Color | Duration | Example |
|------|------|-------|----------|---------|
| Success | `IconCheck` | `--v-status-success` | 5s auto-dismiss | "View saved successfully" |
| Error | `IconAlertCircle` | `--v-status-error` | Persistent (manual dismiss) | "Failed to save view. [Retry]" |
| Warning | `IconAlertTriangle` | `--v-accent-tertiary` | 8s auto-dismiss | "API key approaching rate limit" |
| Info | `IconInfoCircle` | `--v-accent-primary` | 5s auto-dismiss | "Export started. We'll notify you when ready." |
| Progress | `IconLoader` | `--v-accent-primary` | Until complete | "Importing 45 of 1,203 records..." |

### 10.2 Positioning and stacking

- Toasts appear in the bottom-right corner, above the tray bar
- Stack vertically (newest at the bottom)
- Maximum 3 visible at once — older toasts auto-dismiss when a 4th arrives
- Enter animation: slide in from right + fade (200ms ease-out)
- Exit animation: fade out + collapse height (150ms ease-in)

### 10.3 Structure

Every toast has:
- Type icon (left)
- Message text (max 2 lines, truncated with tooltip if longer)
- Action button (optional): "Retry", "View", "Undo"
- Dismiss button (× on the right)
- Progress bar at the bottom (ticking down the auto-dismiss timer)

Hovering a toast pauses its auto-dismiss timer.

### 10.4 Deduplication

If the same toast message fires multiple times within 2 seconds, show only one with a count badge: "View saved successfully (×3)".

---

## 11. Keyboard navigation

Every workflow in Vastu is completable without a mouse.

*Implements: P02 (interactive), P05 (speed), P11 (accessible)*

### 11.1 Global shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open command palette / Spotlight |
| `?` | Open keyboard shortcuts reference |
| `⌘S` | Save current view |
| `⌘Z` | Undo last action |
| `⌘/` | Focus search input |
| `Esc` | Close topmost overlay (modal > drawer > spotlight > filter popover) |

### 11.2 Table shortcuts

| Shortcut | Action |
|----------|--------|
| `j` / `↓` | Move selection to next row |
| `k` / `↑` | Move selection to previous row |
| `o` / `Enter` | Open selected row in drawer |
| `⇥` (Tab) | Open selected row in new panel |
| `x` | Toggle row checkbox |
| `⇧X` | Select all rows |
| `/` | Focus column search |
| `[` / `]` | Previous / next page |

### 11.3 Drawer/panel shortcuts

| Shortcut | Action |
|----------|--------|
| `‹` / `›` | Navigate to previous / next record |
| `e` | Enter edit mode |
| `Esc` | Close drawer / exit edit mode |
| `⌘⇧P` | Promote drawer to panel (⬔) |

### 11.4 Sidebar shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘B` | Toggle sidebar collapsed/expanded |
| `⌘1` – `⌘9` | Jump to page by sidebar position |

### 11.5 Focus management

- Tab order follows visual layout: sidebar → tab bar → toolbar → content → tray
- Focus is trapped inside modals and drawers when open
- When a modal closes, focus returns to the element that triggered it
- Focus rings (`--v-shadow-focus`) are visible only on keyboard navigation (`:focus-visible`), never on mouse click

---

## 12. Panel and window management

Dockview panel interactions follow consistent patterns.

*Implements: P01 (addressable), P05 (speed), P07 (motion)*

### 12.1 Panel operations

| Operation | Trigger | Animation |
|-----------|---------|-----------|
| Open page | Sidebar click, Spotlight select, link click | New tab appears with brief highlight flash |
| Split panel | Drag tab to edge, or Spotlight with ⇥ | Split indicator preview → panel slides into position (200ms) |
| Float panel | Drag tab away from tab bar | Panel detaches with shadow, free-position |
| Minimize to tray | Click `–` in tab bar | Panel shrinks toward tray (180ms), tray item appears |
| Restore from tray | Click tray item | Panel expands from tray position to previous layout slot (200ms) |
| Close panel | Click `×` in tab bar, or tray item `×` | Panel fades out (150ms), adjacent panels fill space |
| Reorder tabs | Drag tab within tab bar | Tab slides to new position (150ms) |

### 12.2 Layout serialization

The entire Dockview layout (which panels are open, their positions, sizes, split ratios, and which is focused) is serialized to the view state. This means:
- Refreshing the page restores the exact layout
- Sharing a URL shares the layout
- MCP can read and write the layout: `workspace.getLayout()` / `workspace.setLayout(state)`

### 12.3 Panel state persistence

Each panel maintains its own state independently:
- Table panels: filters, sort, page, column widths, selected rows
- Detail panels: active tab, scroll position
- Chart panels: zoom level, toggled series
- Builder panels: active config section, form dirty state

When a panel is minimized to the tray and restored, all state is preserved. When a panel is closed and reopened (via Spotlight or sidebar), it opens with the default view state.

---

## Appendix: Pattern-to-principle mapping

| Pattern | Principles |
|---------|-----------|
| Data tables | P01, P02, P03, P05, P08, P09 |
| Filters | P01, P02, P03, P04, P09 |
| Charts | P03, P04, P06, P08, P11 |
| Drawer-to-panel | P01, P05, P07 |
| Right-click menus | P02, P09 |
| Loading choreography | P05, P06, P07 |
| Text truncation | P03, P08 |
| Empty states | P06, P08 |
| Form patterns | P04, P06, P10 |
| Toast notifications | P06, P07 |
| Keyboard navigation | P02, P05, P11 |
| Panel management | P01, P05, P07 |
