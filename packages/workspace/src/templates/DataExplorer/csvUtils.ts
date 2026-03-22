/**
 * CSV generation utilities for DataExplorerTemplate.
 *
 * Implements RFC 4180 escaping and OWASP CSV injection prevention.
 * See: https://owasp.org/www-community/attacks/CSV_Injection
 */

import type { VastuColumn } from '../../components/VastuTable/types';
import type { ExplorerDataRow } from './types';

/**
 * Characters that spreadsheet applications interpret as formula prefixes.
 * Prefix them with a single-quote to neutralise the formula.
 */
const CSV_INJECTION_CHARS = /^[=+\-@\t\r]/;

/** Sanitize a CSV cell value to prevent CSV injection. */
export function sanitizeCsvCell(value: string): string {
  if (CSV_INJECTION_CHARS.test(value)) {
    return `'${value}`;
  }
  return value;
}

/** Escape and quote a CSV cell value per RFC 4180. */
export function escapeCsvCell(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '""';
  const str = sanitizeCsvCell(String(raw));
  // Always quote: escape internal double-quotes by doubling them
  return `"${str.replace(/"/g, '""')}"`;
}

/** Escape and quote a CSV header value per RFC 4180. */
export function escapeCsvHeader(label: string): string {
  // Always quote headers and escape internal double-quotes
  return `"${label.replace(/"/g, '""')}"`;
}

/** Build the CSV string from data rows and column definitions. Returns empty string when inputs are empty. */
export function buildCsvString(
  data: ExplorerDataRow[],
  columns: VastuColumn<ExplorerDataRow>[],
): string {
  if (columns.length === 0 || data.length === 0) return '';

  const header = columns.map((c) => escapeCsvHeader(c.label)).join(',');
  const rows = data.map((row) => columns.map((c) => escapeCsvCell(row[c.id])).join(','));

  return [header, ...rows].join('\n');
}

/** Download the visible table data as a CSV file. */
export function downloadCsv(
  data: ExplorerDataRow[],
  columns: VastuColumn<ExplorerDataRow>[],
): void {
  const csv = buildCsvString(data, columns);
  if (!csv) return;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'data-export.csv';
  link.click();
  // Delay revocation to allow the browser to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
