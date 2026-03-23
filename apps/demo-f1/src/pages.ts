/**
 * demo-f1 page registrations
 *
 * Registers all F1 demo application pages via PageRegistry.
 * Pages appear in the sidebar, command palette, and page picker automatically.
 *
 * This file is loaded at app startup before the workspace renders.
 *
 * Full page configurations (9 pages across all 6 templates) are implemented
 * in US-223. This stub establishes the file structure and import pattern.
 *
 * Templates used:
 *   table-listing    — Races, Drivers, Constructors
 *   summary-dashboard — Championship
 *   multi-tab-detail — Driver Profile
 *   data-explorer    — Lap Time Explorer
 *   form-page        — Race Report
 *   timeline-activity — Race Weekend
 *   dashboard        — My Dashboard
 *
 * Cross-page navigation:
 *   driver name  → Driver Profile (id: 'f1-driver-profile')
 *   race name    → Race Weekend   (id: 'f1-race-weekend')
 *   constructor  → Constructors   (id: 'f1-constructors')
 *
 * Usage:
 *   import { PageRegistry } from '@vastu/workspace';
 *
 *   PageRegistry.register({
 *     id: 'f1-races',
 *     name: 'Races',
 *     icon: 'IconFlag',
 *     template: 'table-listing',
 *     section: 'PAGES',
 *     order: 1,
 *     config: {
 *       table: 'Race',
 *       columns: [
 *         { field: 'name', header: 'Name' },
 *         { field: 'circuit.name', header: 'Circuit' },
 *         { field: 'date', header: 'Date' },
 *       ],
 *       defaultSort: [{ column: 'date', direction: 'desc' }],
 *     },
 *   });
 */

// import { PageRegistry } from '@vastu/workspace';

// ---------------------------------------------------------------------------
// Register F1 pages below (full implementation: US-223)
// ---------------------------------------------------------------------------

// TODO (US-223): Register the 9 F1 demo pages here.
// See the example comment above and the Vastu docs for full PageRegistry API.
