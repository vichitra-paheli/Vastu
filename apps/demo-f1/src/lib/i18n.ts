/**
 * i18n — Synchronous t() wrapper for demo-f1.
 *
 * This module provides a synchronous `t(key)` function backed by the
 * flat dot-notation message catalog in messages/en.json.
 *
 * Safe to call anywhere — in generateMetadata(), server components,
 * client components, validation schemas, and form helpers.
 *
 * All user-facing strings must go through t('key') for future i18n support.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const translations = require('../../messages/en.json') as Record<string, string>;

/**
 * Translate a key to its English string.
 *
 * Returns the key itself when no translation is registered, which:
 *   - makes missing translations easy to spot during development
 *   - avoids crashes if a key is referenced before being added to en.json
 */
export function t(key: string): string {
  if (process.env.NODE_ENV !== 'production' && translations[key] === undefined) {
    console.warn(`[i18n] Missing translation key: "${key}"`);
  }
  return translations[key] ?? key;
}
