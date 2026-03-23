/**
 * demo-f1 custom formatter registrations
 *
 * Registers F1-domain cell formatters via FormatterRegistry.
 * Formatters control how data values are displayed in VastuTable cells
 * and VastuChart tooltips.
 *
 * This file is loaded at app startup before the workspace renders.
 *
 * Full formatter implementations are provided in US-222.
 * This stub establishes the file structure and the formatters that will
 * be registered (their names match the column displayType config in pages.ts).
 *
 * Formatters to be registered (US-222):
 *
 *   lap-time         ms → "1:23.456"              Lap times, Q1/Q2/Q3, fastest lap
 *   pit-duration     ms → "2.4s"                  Pit stop duration
 *   tire-compound    enum → colored pill           Pit stops, strategy view
 *   position-change  delta → "▲3"/"▼2"/"—"        Race result grid-vs-finish
 *   race-status      enum → colored badge          Race result status
 *   nationality-flag country → flag + code         Drivers, constructors
 *   circuit-type     enum → colored badge          Circuits list
 *   weather          enum → icon + label           Races list
 *
 * Usage:
 *   import { FormatterRegistry } from '@vastu/workspace';
 *
 *   FormatterRegistry.register('lap-time', {
 *     // Required: renders the cell value as a React node
 *     render: (value: number) => {
 *       const totalMs = value;
 *       const minutes = Math.floor(totalMs / 60000);
 *       const seconds = Math.floor((totalMs % 60000) / 1000);
 *       const ms = totalMs % 1000;
 *       return `${minutes}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
 *     },
 *     // Optional: plain-text value for CSV/Excel export
 *     export: (value: number) => {
 *       const totalMs = value;
 *       const minutes = Math.floor(totalMs / 60000);
 *       const seconds = Math.floor((totalMs % 60000) / 1000);
 *       const ms = totalMs % 1000;
 *       return `${minutes}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
 *     },
 *     // Optional: sort numerically (already a number, default sort works)
 *     sort: (a: number, b: number) => a - b,
 *   });
 */

// import { FormatterRegistry } from '@vastu/workspace';

// ---------------------------------------------------------------------------
// Register F1 formatters below (full implementation: US-222)
// ---------------------------------------------------------------------------

// TODO (US-222): Register the 8 F1 custom formatters here.
// See the example comment above and the Vastu docs for full FormatterRegistry API.
