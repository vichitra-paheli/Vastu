/**
 * Vastu theme constants — server-safe, plain TypeScript values.
 *
 * These are intentionally NOT CSS custom properties because they are consumed
 * in two server-side contexts that cannot read runtime CSS variables:
 *   1. QR code generation in the MFA setup API route (qrcode library expects
 *      literal hex strings, not var(--v-*) references).
 *   2. The ACCENT_PRESETS data array used as ColorSwatch color values in
 *      AppearanceSettings (Mantine ColorSwatch requires a raw color string).
 *
 * Any change to these values should be reflected in vastu.tokens.css as well
 * to keep the design system consistent.
 */

// ---------------------------------------------------------------------------
// Accent color presets — the eight user-selectable accent colors shown in the
// appearance settings page. The first entry is the default (Indigo / #4C6EF5).
// ---------------------------------------------------------------------------

export interface AccentPreset {
  value: string;
  label: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { value: '#4C6EF5', label: 'Indigo (default)' },
  { value: '#2378CB', label: 'Steel Blue' },
  { value: '#0CA678', label: 'Teal' },
  { value: '#F76707', label: 'Orange' },
  { value: '#E03131', label: 'Red' },
  { value: '#9C36B5', label: 'Purple' },
  { value: '#1098AD', label: 'Cyan' },
  { value: '#37B24D', label: 'Green' },
];

/** The default accent color (first preset). */
export const DEFAULT_ACCENT_COLOR = ACCENT_PRESETS[0].value;

// ---------------------------------------------------------------------------
// QR code colors — used when generating TOTP QR code images server-side.
// dark matches --v-text-primary light-mode value (#1a1a1a).
// light matches --v-bg-primary light-mode value (#ffffff).
// ---------------------------------------------------------------------------

export const QR_COLORS = {
  dark: '#1a1a1a',
  light: '#ffffff',
} as const;
