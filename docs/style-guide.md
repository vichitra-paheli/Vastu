# Vastu Design System — Style Guide

> Version 0.1 · March 2026 · Living document
> Framework: Mantine v7 · Target: 1280×800+ · Data-dense enterprise application
> Companion files: `vastu.theme.ts` (Mantine config) · `vastu.tokens.css` (CSS custom properties)

---

## Table of contents

1. Color system
2. Typography
3. Spacing
4. Border radii
5. Shadows and elevation
6. Z-index layers
7. Motion and transitions
8. Icons
9. Component inventory
10. Chart data visualization

---

## 1. Color system

Three independent color systems: UI accents, semantic status, and chart series. They never cross roles.

### 1.1 Neutral palette

The foundation. Used for backgrounds, text, borders, and all non-accented surfaces.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--v-bg-primary` | `#FFFFFF` | `#1A1A1A` | Page background, card fills, inputs |
| `--v-bg-secondary` | `#F5F5F5` | `#242424` | Sidebar, table headers, tray bar, section fills |
| `--v-bg-tertiary` | `#EBEBEB` | `#2E2E2E` | Hover states, disabled fills, tag backgrounds |
| `--v-bg-elevated` | `#FFFFFF` | `#2A2A2A` | Dropdowns, tooltips, modals (same as primary in light, slightly lifted in dark) |
| `--v-text-primary` | `#1A1A1A` | `#E8E8E8` | Headings, data values, primary labels |
| `--v-text-secondary` | `#666666` | `#A0A0A0` | Descriptions, secondary labels, metadata |
| `--v-text-tertiary` | `#999999` | `#6B6B6B` | Placeholders, hints, timestamps, disabled text |
| `--v-text-inverted` | `#FFFFFF` | `#1A1A1A` | Text on filled buttons, badges with solid backgrounds |
| `--v-border-default` | `#E0E0E0` | `#333333` | Card borders, table grid lines, input borders |
| `--v-border-subtle` | `#F0F0F0` | `#2A2A2A` | Table row separators, section dividers |
| `--v-border-strong` | `#CCCCCC` | `#444444` | Focused input borders, active card outlines |

### 1.2 UI accent palette (long-tail distribution)

Four colors for the UI chrome. Usage frequency follows a long-tail curve.

| Token | Hex | Name | Usage (~%) | Where |
|-------|-----|------|-----------|-------|
| `--v-accent-primary` | `#2378CB` | Steel blue | ~50% | Active tabs, primary buttons, links, selected states, focus rings, checked toggles, progress bars, active filter pills |
| `--v-accent-secondary` | `#5C6B73` | Slate | ~22% | Builder mode switch, secondary button hover, icon fills, sidebar section headers, mode indicator backgrounds |
| `--v-accent-tertiary` | `#C89420` | Goldenrod | ~15% | Modified/unsaved indicator, attention badges, SLA warnings, notification counts, agent workflow accent |
| `--v-accent-quaternary` | `#7B61A6` | Muted violet | ~8% | Agent/AI indicators, workflow mode tab, agent panel accent, A2UI section borders, custom role badges |

Each accent has computed tints for backgrounds (12% opacity) and hover states (darker by 10%):

| Token | Value | Usage |
|-------|-------|-------|
| `--v-accent-primary-light` | `#2378CB1F` | Selected row tint, active filter pill background |
| `--v-accent-primary-hover` | `#1E69B5` | Primary button hover |
| `--v-accent-tertiary-light` | `#C894201F` | Modified state background tint |
| `--v-accent-quaternary-light` | `#7B61A61F` | Agent section background tint |

### 1.3 Semantic status colors

Used exclusively for communicating system/data status. Never for UI decoration.

| Token | Hex | Usage |
|-------|-----|-------|
| `--v-status-success` | `#1D9E75` | Shipped badges, live connection indicators, positive deltas, valid inputs |
| `--v-status-success-light` | `#1D9E7515` | Success badge background, positive delta tint |
| `--v-status-warning` | `#E8590C` | Pending badges, idle connections, approaching limits |
| `--v-status-warning-light` | `#E8590C15` | Warning badge background |
| `--v-status-error` | `#DC3628` | Error states, failed connections, cancelled badges, negative deltas, validation errors |
| `--v-status-error-light` | `#DC362815` | Error badge background, validation field tint |

### 1.4 Chart discrete series palette

Independent from the UI. Used only for multi-series data visualizations. Order matters — the first color is always the first series.

| Index | Hex | Notes |
|-------|-----|-------|
| 0 | `#76B900` | Green — high contrast against white and dark |
| 1 | `#9ACCF2` | Light blue — desaturated, separates from adjacent |
| 2 | `#A96700` | Dark amber — warm anchor |
| 3 | `#FEB3AD` | Light salmon — soft, legible |
| 4 | `#A05AB4` | Purple — distinct hue shift |
| 5 | `#BFE882` | Light green — desaturated pair of index 0 |
| 6 | `#2378CB` | Strong blue — matches UI primary (intentional) |
| 7 | `#E7C32B` | Yellow — bright separator |
| 8 | `#DC3628` | Red — urgent/final |
| 9 | `#DEBAE8` | Light lavender — soft close |

Pattern: alternates saturated ↔ desaturated and warm ↔ cool. Any two adjacent colors are always visually distinct even at 12px line width. For sequential/diverging color scales, derive from these base hues using lightness ramps (see Chart data visualization section).

---

## 2. Typography

### 2.1 Font stack

| Token | Value | Usage |
|-------|-------|-------|
| `--v-font-sans` | `'Inter', -apple-system, 'Segoe UI', sans-serif` | All UI text |
| `--v-font-mono` | `'JetBrains Mono', 'SF Mono', 'Consolas', monospace` | Code, IDs, connection strings, timestamps, monospaced data |

Inter is the primary typeface — open source, excellent at small sizes, wide language support, variable font with optical sizing. Load weights 400 and 500 only.

### 2.2 Type scale

Optimized for 1280px viewport with data-dense layouts. Based on our wireframe scale (12/14/16/20px).

| Token | Size | Weight | Line height | Usage |
|-------|------|--------|-------------|-------|
| `--v-text-xs` | `11px` | 400 | 1.45 | Fine print, timestamps in compact density, chart axis labels |
| `--v-text-sm` | `12px` | 400 | 1.5 | Table data cells, badge text, metadata, filter pills, tab labels |
| `--v-text-md` | `14px` | 400 | 1.55 | Default body text, input values, sidebar nav items, drawer fields |
| `--v-text-lg` | `16px` | 500 | 1.5 | Section headers, card titles, drawer section labels |
| `--v-text-xl` | `20px` | 500 | 1.4 | Page titles, entity names in detail views |
| `--v-text-2xl` | `24px` | 500 | 1.3 | KPI numbers, dashboard greeting |
| `--v-text-3xl` | `32px` | 500 | 1.2 | Hero KPIs (rare — only on summary dashboards) |

### 2.3 Weight rules

Only two weights used across the entire system:

| Weight | Token | Usage |
|--------|-------|-------|
| 400 (Regular) | `--v-font-regular` | Body text, data values, descriptions, all table content |
| 500 (Medium) | `--v-font-medium` | Headings, labels, buttons, active nav items, KPI numbers |

Never use 600 or 700. The density of the UI provides enough visual hierarchy through size and color — heavy weights compete with data.

### 2.4 Monospace sizing

Monospace text is set 1px smaller than its context to optically match the x-height of Inter:

| Context | Sans size | Mono size |
|---------|-----------|-----------|
| Table cell | 12px | 11px |
| Body text | 14px | 13px |
| Input field | 14px | 13px |

---

## 3. Spacing

Base unit: `4px`. All spacing is a multiple of 4. Mantine's spacing scale maps to these tokens.

| Token | Value | Usage |
|-------|-------|-------|
| `--v-space-1` | `4px` | Minimum gap — between badge icon and text, inline element pairs |
| `--v-space-2` | `8px` | Tight gaps — between filter pills, between icon and label in nav items |
| `--v-space-3` | `12px` | Standard gap — between form fields in a row, card internal element spacing |
| `--v-space-4` | `16px` | Section gap — between card sections, between filter bar and table |
| `--v-space-5` | `20px` | Large gap — between major sections on a settings page |
| `--v-space-6` | `24px` | Card padding, drawer internal padding, modal padding |
| `--v-space-8` | `32px` | Page margin, major section separation |
| `--v-space-10` | `40px` | Top-level page padding, dashboard card grid gap |

### 3.1 Component-specific spacing

| Context | Padding | Gap |
|---------|---------|-----|
| Card (dashboard) | 16px | — |
| Card (detail/settings) | 24px | — |
| Table row (compact) | 4px 12px | — |
| Table row (comfortable) | 8px 12px | — |
| Table row (spacious) | 12px 12px | — |
| Button (sm) | 4px 12px | 6px (icon-text) |
| Button (md) | 8px 16px | 8px (icon-text) |
| Input field | 8px 12px | — |
| Filter pill | 4px 10px | 6px (icon-text) |
| Modal | 24px | 16px (between sections) |
| Sidebar collapsed | 12px 0 (centered) | 8px (between icons) |
| Sidebar expanded | 12px 16px | 4px (between items) |

---

## 4. Border radii

| Token | Value | Usage |
|-------|-------|-------|
| `--v-radius-sm` | `2px` | Table cells, inline code, tight elements |
| `--v-radius-md` | `4px` | Buttons, inputs, dropdowns, badges, menu items |
| `--v-radius-lg` | `8px` | Cards, modals, drawers, panels, dashboard cards |
| `--v-radius-xl` | `12px` | Page-level containers, login card, onboarding modals |
| `--v-radius-pill` | `9999px` | Filter pills, status badges, toggle tracks, tag chips |

Rule: The more "structural" a component is, the smaller its radius. Inputs and buttons are `md`, the cards that contain them are `lg`. Pills that float inside cards are `pill`.

---

## 5. Shadows and elevation

Minimal shadow use. Vastu is a flat UI — elevation is communicated through borders and background differences, not drop shadows.

| Token | Value | Usage |
|-------|-------|-------|
| `--v-shadow-none` | `none` | Default — most elements have no shadow |
| `--v-shadow-sm` | `0 1px 3px rgba(0,0,0,0.06)` | Dropdowns, popovers, context menus (elements that float over content) |
| `--v-shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | Modals, command palette, floating Dockview panels |
| `--v-shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Drag preview (panel being dragged), toast notifications |
| `--v-shadow-focus` | `0 0 0 2px var(--v-accent-primary)40` | Focus ring on all interactive elements (keyboard nav only) |

Dark mode adjustments: shadow opacity increases by 50% (e.g., `0.06` → `0.09`) since dark backgrounds absorb light.

---

## 6. Z-index layers

Strict layering to prevent stacking context conflicts.

| Token | Value | Layer | Contents |
|-------|-------|-------|----------|
| `--v-z-base` | `0` | Content | Page content, table rows, cards |
| `--v-z-sticky` | `10` | Sticky | Table headers, view toolbar, filter bar |
| `--v-z-sidebar` | `20` | Navigation | Sidebar (collapsed and expanded) |
| `--v-z-tray` | `30` | Tray | Tray bar, tray tooltips |
| `--v-z-dropdown` | `40` | Floating | Dropdowns, popovers, context menus, select options |
| `--v-z-drawer` | `50` | Overlay | Record detail drawer, builder config panel |
| `--v-z-modal` | `60` | Modal | Modals, confirmation dialogs, share dialog |
| `--v-z-spotlight` | `70` | Command | Command palette (⌘K) — always on top of modals |
| `--v-z-toast` | `80` | Notification | Toast notifications — visible above everything |
| `--v-z-tooltip` | `90` | Tooltip | Tooltips — highest layer, never occluded |

---

## 7. Motion and transitions

All motion serves orientation (where did it come from, where did it go). See Principle 07.

### 7.1 Duration tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--v-duration-fast` | `100ms` | Hover states, focus rings, button press feedback |
| `--v-duration-normal` | `200ms` | Panel resize, sidebar expand/collapse, tab switch |
| `--v-duration-slow` | `300ms` | Drawer slide in/out, modal fade, tray minimize/restore |
| `--v-duration-layout` | `500ms` | Table height reflow on filter, dashboard card reorder (max allowed) |

### 7.2 Easing tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--v-ease-default` | `cubic-bezier(0.2, 0, 0.2, 1)` | Most transitions — smooth deceleration |
| `--v-ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving the screen (drawer closing, toast dismissing) |
| `--v-ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the screen (drawer opening, modal appearing) |
| `--v-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Subtle overshoot for micro-interactions (toggle switch, badge count change) |

### 7.3 Transition presets (CSS shorthand)

```css
/* Reusable transition hooks — import and apply */
--v-transition-color: color var(--v-duration-fast) var(--v-ease-default);
--v-transition-bg: background-color var(--v-duration-fast) var(--v-ease-default);
--v-transition-border: border-color var(--v-duration-fast) var(--v-ease-default);
--v-transition-shadow: box-shadow var(--v-duration-fast) var(--v-ease-default);
--v-transition-transform: transform var(--v-duration-normal) var(--v-ease-default);
--v-transition-slide: transform var(--v-duration-slow) var(--v-ease-out);
--v-transition-fade: opacity var(--v-duration-normal) var(--v-ease-default);
--v-transition-layout: height var(--v-duration-layout) var(--v-ease-default);
```

### 7.4 Reduced motion

All animations and transitions must be wrapped:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Icons

### 8.1 Library

**Tabler Icons** — the default icon set for Mantine v7. 5,000+ icons, consistent 24px grid, 1.5px stroke weight. MIT licensed.

Package: `@tabler/icons-react`

### 8.2 Size scale

| Token | Size | Stroke | Usage |
|-------|------|--------|-------|
| `--v-icon-xs` | `14px` | 1.5px | Inline with 12px text — badge icons, filter pill close, sort indicators |
| `--v-icon-sm` | `16px` | 1.5px | Inline with 14px text — nav items, input icons, table row actions |
| `--v-icon-md` | `20px` | 1.5px | Standalone buttons — toolbar actions, card actions, tray items |
| `--v-icon-lg` | `24px` | 1.5px | Sidebar icons (collapsed), empty state icons, modal close |
| `--v-icon-xl` | `32px` | 1.5px | Page-level empty states, onboarding illustrations (rare) |

### 8.3 Color rules

- **Default:** `--v-text-secondary` (#666 light / #A0A0A0 dark). Most icons.
- **Active/selected:** `--v-accent-primary` (#2378CB). Current nav item, active toolbar action.
- **Interactive hover:** `--v-text-primary` (#1A1A1A / #E8E8E8). Darkens on hover.
- **Semantic:** Match the status color. Green checkmark for success, red X for error.
- **Disabled:** `--v-text-tertiary` (#999 / #6B6B6B). 50% opacity optional.

### 8.4 Core icon mappings

Consistent icons across the system — same action always uses the same icon.

| Action/Concept | Tabler Icon | Notes |
|----------------|-------------|-------|
| Search | `IconSearch` | |
| Filter | `IconFilter` | |
| Sort ascending | `IconSortAscending` | |
| Sort descending | `IconSortDescending` | |
| Add/Create | `IconPlus` | |
| Edit | `IconPencil` | |
| Delete | `IconTrash` | |
| Close | `IconX` | |
| Settings/Config | `IconSettings` | |
| User | `IconUser` | |
| Expand/Maximize | `IconArrowsMaximize` | |
| Collapse/Minimize | `IconArrowsMinimize` | |
| Chevron down | `IconChevronDown` | Dropdowns, collapsible sections |
| Chevron right | `IconChevronRight` | Breadcrumb separator, nav expand |
| More actions | `IconDots` | Overflow/context menu trigger (⋯) |
| External link | `IconExternalLink` | Opens in new tab/panel |
| Copy | `IconCopy` | |
| Share | `IconShare` | |
| Export | `IconDownload` | |
| Import | `IconUpload` | |
| Save | `IconDeviceFloppy` | |
| Undo | `IconArrowBack` | |
| Refresh | `IconRefresh` | |
| Calendar/Date | `IconCalendar` | Date pickers, time ranges |
| Database | `IconDatabase` | DB connections |
| Key | `IconKey` | API keys, auth |
| Shield/Lock | `IconShield` | Permissions, security |
| Agent/Bot | `IconRobot` | Agent-related surfaces |
| Workflow | `IconGitBranch` | Workflow mode, React Flow |
| Dashboard | `IconLayoutDashboard` | |
| Table/List | `IconTable` | Table listing template |
| Chart | `IconChartLine` | Data explorer, charts |
| Form | `IconForms` | Form page template |
| Timeline | `IconTimeline` | Activity/timeline template |
| Pin | `IconPin` | Pin to dashboard |
| Keyboard | `IconKeyboard` | Keyboard shortcuts reference |
| Eye | `IconEye` | View/preview |
| Eye off | `IconEyeOff` | Hidden/masked content |
| Check | `IconCheck` | Success, selected, complete |
| Alert triangle | `IconAlertTriangle` | Warning states |
| Alert circle | `IconAlertCircle` | Error states |
| Info circle | `IconInfoCircle` | Informational |

### 8.5 Custom icons

For the Vastu brand mark (Kundli motif) and any icons not in Tabler, use inline SVGs matching these specs: 24px viewBox, 1.5px stroke, `currentColor` fill/stroke, `stroke-linecap="round"` and `stroke-linejoin="round"`.

---

## 9. Component inventory

Three tiers: use as-is from Mantine, wrap/customize, or build from scratch.

### 9.1 Use as-is (Mantine v7)

These need only theme token application — no wrapper components.

| Component | Mantine | Notes |
|-----------|---------|-------|
| Button | `Button` | Variants: filled (primary), outline (secondary), subtle (tertiary) |
| Text input | `TextInput` | With `--v-radius-md`, standard padding |
| Select | `Select` | Searchable by default for lists > 8 items |
| Multi-select | `MultiSelect` | For multi-value filters |
| Checkbox | `Checkbox` | Accent primary when checked |
| Radio | `Radio` | |
| Switch | `Switch` | For toggles (builder config, settings) |
| Textarea | `Textarea` | Auto-resize enabled |
| Number input | `NumberInput` | For numeric config knobs |
| Slider | `Slider` | For range config knobs (advanced settings) |
| Badge | `Badge` | Status badges, role badges, type pills |
| Avatar | `Avatar` | User initials, entity icons |
| Tooltip | `Tooltip` | Truncation reveal, icon labels, tray preview |
| Modal | `Modal` | Confirmation dialogs, share, import, create |
| Drawer | `Drawer` | Record detail, permissions editor |
| Menu | `Menu` | Context menus, overflow menus |
| Tabs | `Tabs` | Drawer tabs, detail view tabs (before RBAC wrapping) |
| Accordion | `Accordion` | Builder config sections, advanced settings |
| Skeleton | `Skeleton` | Loading states for every data-dependent region |
| Progress | `Progress` | Upload progress, bulk operation progress |
| Notification | `notifications` | Toast notifications (via `@mantine/notifications`) |
| Spotlight | `Spotlight` | Command palette (⌘K) base (via `@mantine/spotlight`) |
| Pagination | `Pagination` | Table pagination |
| Breadcrumbs | `Breadcrumbs` | Shell settings navigation |
| Stepper | `Stepper` | Form page multi-step wizard |
| Segmented control | `SegmentedControl` | Density toggle, chart type switch, light/dark/system |
| Color swatch | `ColorSwatch` | Appearance settings color picker |
| Divider | `Divider` | Section separators |
| Kbd | `Kbd` | Keyboard shortcut display |
| Loader | `Loader` | Inline loading spinner |
| Indicator | `Indicator` | Notification badge dots |
| ActionIcon | `ActionIcon` | Icon-only buttons (close, minimize, refresh) |
| CopyButton | `CopyButton` | API key copy, shareable link copy |
| ScrollArea | `ScrollArea` | Custom scrollbars for panels and drawers |
| Paper | `Paper` | Card wrapper with elevation |
| Group / Stack | `Group` / `Stack` | Flex layout primitives |
| Grid | `Grid` | Dashboard card grid |
| Popover | `Popover` | Inline detail popovers |
| HoverCard | `HoverCard` | Tray item preview |

### 9.2 Wrap and customize

These use Mantine components as a base but add Vastu-specific behavior.

| Component | Base | Customization |
|-----------|------|---------------|
| `VastuTable` | TanStack Table + Mantine styling | View state serialization, column config from builder, virtual scrolling, right-click context menus, row selection, bulk actions bar |
| `VastuTabs` | `Tabs` | RBAC-gated tab visibility (tabs hidden if user lacks permission), tab count badges |
| `VastuSelect` | `Select` | Searchable, with DB-backed options loading, async search, create-new option |
| `VastuDateRange` | `DatePickerInput` | Preset ranges (Last 7d, 30d, 90d, YTD, custom), relative date support |
| `VastuRichText` | TipTap + Mantine wrapper | Notes editor in record detail, agent chat input |
| `VastuFilterPill` | `Badge` + `CloseButton` | Composable filter pills with type-aware value display, removable |
| `VastuContextMenu` | `Menu` | Right-click trigger, position-aware, action-specific per data type (cell, row, chart segment) |
| `VastuForm` | `@mantine/form` | Validation presets (email, URL, required), multi-step state, draft auto-save |
| `VastuChart` | Recharts + wrapper | Config knobs integration (basic/advanced), responsive container, loading/error states, legend as HTML |
| `VastuCodeEditor` | Monaco + container | For builder hooks, custom queries. Sandboxed execution preview. |

### 9.3 Build from scratch (custom components)

These have no Mantine equivalent — they are Vastu-specific.

| Component | Description | Key behaviors |
|-----------|-------------|---------------|
| `WorkspaceShell` | Top-level layout: sidebar + Dockview host + tray | Manages panel state, sidebar collapse, responsive breakpoints |
| `DockviewHost` | Dockview integration wrapper | Panel serialization/deserialization, tab bar with mode switch, window controls (minimize to tray, float, split) |
| `TrayBar` | Bottom taskbar for minimized panels | Pills with badges, hover preview, right-click restore menu, overflow +N, ⌘K shortcut |
| `SidebarNav` | Collapsible navigation | 48px collapsed (icon rail) ↔ 200px expanded, PAGES/SYSTEM/ADMIN sections, pin toggle, search, user avatar |
| `ViewToolbar` | View state controls | View picker dropdown, save/save-as/share/export, modified indicator, reset link |
| `ViewPicker` | Saved views dropdown | My Views + Shared With Me sections, color dot identifiers, search, create new |
| `BuilderPanel` | Page configuration surface | Two-column: section nav + config forms. Data source, field config, permissions, hooks |
| `ModeSwitch` | Editor/Builder/Workflow toggle | Segmented control with RBAC gating, active mode highlight |
| `KPICard` | Dashboard metric card | Value, label, delta with direction arrow, optional sparkline. Configurable via builder |
| `RecordDrawer` | Slide-out detail panel | ‹/› record nav, pop-to-panel, expand, tabs (Details/Items/History/Notes/Permissions), sticky footer |
| `AgentPanel` | Chat interface for agents | Message history, suggested actions, streaming response, AG-UI protocol rendering |
| `AgentUI` | A2UI rendered section | Agent-generated components using Vastu's own component library, sandboxed |
| `WorkflowCanvas` | React Flow editor | Node palette, flow connections, execution log, agent node types |
| `TruncatedText` | System-wide text truncation | Ellipsis + full value tooltip. One utility component used everywhere per Principle 08 |
| `EmptyState` | Contextual empty state | Informative message + action button. Per-context content (no generic illustration) |
| `ConfirmDialog` | Destructive action confirmation | Impact description, color-coded action button (red/amber/blue), cancel |
| `ShortcutsModal` | Keyboard reference overlay | Grouped by context (General, Table, Workspace, Builder, Workflow, Agent) |

---

## 10. Chart data visualization

### 10.1 Chart library

**Recharts** — React-native, composable, declarative. Used for all standard charts (line, bar, area, pie, donut).

For React Flow workflow canvas, use `@xyflow/react`.

### 10.2 Discrete series colors

Use the provided palette in order. Never rearrange for aesthetics — consistency across views matters more than per-chart optimization.

```typescript
export const CHART_SERIES_COLORS = [
  '#76B900', '#9ACCF2', '#A96700', '#FEB3AD', '#A05AB4',
  '#BFE882', '#2378CB', '#E7C32B', '#DC3628', '#DEBAE8',
];
```

If more than 10 series, group the tail into "Other" with `--v-text-tertiary` color.

### 10.3 Sequential color scales

For heatmaps, choropleths, and continuous-value encoding, derive a 5-stop ramp from a single base hue:

| Scale | Stops (light → dark) | Base hue |
|-------|---------------------|----------|
| Blue sequential | `#E6F1FB` → `#B5D4F4` → `#85B7EB` → `#2378CB` → `#0C447C` | Steel blue |
| Green sequential | `#E1F5EE` → `#9FE1CB` → `#5DCAA5` → `#1D9E75` → `#085041` | Teal/success |
| Warm sequential | `#FFF3E0` → `#FAC775` → `#EF9F27` → `#C89420` → `#854F0B` | Goldenrod |

### 10.4 Diverging color scales

For scales with a meaningful midpoint (positive/negative, above/below average):

| Scale | Negative → Midpoint → Positive |
|-------|---------------------------------|
| Red-Blue | `#DC3628` → `#F09595` → `#F5F5F5` → `#85B7EB` → `#2378CB` |
| Red-Green | `#DC3628` → `#F09595` → `#F5F5F5` → `#9FE1CB` → `#1D9E75` |

Midpoint is always neutral gray `#F5F5F5` (light) or `#333333` (dark).

### 10.5 Chart styling tokens

| Property | Value | Notes |
|----------|-------|-------|
| Axis line color | `--v-border-default` | |
| Grid line color | `--v-border-subtle` | |
| Axis label font | `--v-font-sans` at `--v-text-xs` (11px) | |
| Tooltip background | `--v-bg-elevated` | With `--v-shadow-sm` |
| Tooltip font | `--v-text-sm` (12px) | |
| Legend font | `--v-text-sm` (12px) | Custom HTML legend, not Recharts default |
| Legend swatch | 10×10px square, `--v-radius-sm` | Never circles — squares are more legible |
| Bar corner radius | 2px top corners only | Grounded bars look more data-serious |
| Line stroke width | 2px default, 1.5px for >5 series | |
| Area fill opacity | 0.08 | Subtle — area charts are about the line, not the fill |
| Dot radius | 3px (hidden by default, shown on hover) | |

---

## Appendix: Token naming convention

All Vastu tokens use the `--v-` prefix to avoid collision with Mantine's `--mantine-` tokens. In TypeScript/component code, use the semantic names (e.g., `theme.colors.accent.primary`). In CSS, use the custom properties (e.g., `var(--v-accent-primary)`).

Mantine's generated tokens (e.g., `--mantine-color-blue-6`) remain available but should not be used directly in application code — always reference through Vastu tokens for maintainability.
