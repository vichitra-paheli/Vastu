/**
 * i18n — Phase 1A
 *
 * This module replaces the Phase 0 stub with a proper next-intl integration
 * while preserving 100% backward compatibility with the existing `t('key')`
 * call pattern throughout the codebase.
 *
 * ## Design
 *
 * The messages file (`messages/en.json`) uses **flat dot-notation keys**
 * (e.g. `"login.title": "Welcome back"`) rather than nested objects. This is
 * intentional: some keys like `"error.notFound"` and `"error.notFound.message"`
 * both exist as strings, which would conflict in a nested JSON structure.
 *
 * The synchronous `t(key)` wrapper reads from the flat translations record at
 * module load time and is safe to call:
 *   - in `generateMetadata()` (module-level const, not async)
 *   - in React server components (synchronous render)
 *   - in client components (no hooks required)
 *   - in validation schemas / form helpers (non-React code)
 *
 * ## Upgrading individual call sites
 *
 * When a server component needs locale-aware translation (e.g. respecting a
 * per-user language preference), use `getTranslations()` from next-intl directly:
 *
 * ```ts
 * import { getTranslations } from 'next-intl/server';
 * const t = await getTranslations(); // uses flat key lookup
 * ```
 *
 * Client components can use `useTranslations()` from next-intl directly:
 *
 * ```ts
 * import { useTranslations } from 'next-intl';
 * const t = useTranslations(); // uses flat key lookup via NextIntlClientProvider
 * ```
 *
 * Phase 1 only supports English. Additional locales (loaded from
 * `messages/{locale}.json`) will be added when the appearance settings
 * language switcher is built.
 */

// Import the flat translations record at module load time so `t()` is
// synchronous and safe to call anywhere — including module-level `metadata`
// exports, form validators, and non-React utility code.
//
// eslint-disable-next-line @typescript-eslint/no-require-imports
const translations = require('../../messages/en.json') as Record<string, string>;

/**
 * Translate a key to its English string.
 *
 * Backward-compatible synchronous wrapper over the next-intl message catalog.
 * Returns the key itself when no translation is registered, which:
 *   - makes missing translations easy to spot during development
 *   - avoids crashes if a key is referenced before being added to en.json
 *   - matches the Phase 0 stub behaviour exactly
 *
 * All user-facing strings **must** go through `t('key')` for future i18n support.
 * Keys are namespaced by feature: `'login.title'`, `'common.save'`, etc.
 */
export function t(key: string): string {
  if (process.env.NODE_ENV !== 'production' && translations[key] === undefined) {
    // Warn in development so missing keys are visible immediately without
    // crashing the application. In production the key string is returned
    // silently to avoid surfacing internal key names to users.
    console.warn(`[i18n] Missing translation key: "${key}"`);
  }
  return translations[key] ?? key;
}
