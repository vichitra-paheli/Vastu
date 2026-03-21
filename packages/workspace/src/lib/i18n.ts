/**
 * i18n — workspace package translation helper.
 *
 * Synchronous t(key) wrapper over a flat translations record.
 * Workspace-specific keys live in messages/en.json at the workspace root.
 *
 * For keys used across shell + workspace, reference the shell's messages/en.json.
 * Keys are namespaced by feature: 'workspace.welcome.title', etc.
 *
 * Returns the key itself when no translation is found, making missing
 * translations easy to spot during development without crashing.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const translations = require('../../messages/en.json') as Record<string, string>;

/**
 * Translate a workspace key to its English string.
 * All user-facing strings must use this function for future i18n support.
 */
export function t(key: string): string {
  if (process.env.NODE_ENV !== 'production' && translations[key] === undefined) {
    console.warn(`[i18n/workspace] Missing translation key: "${key}"`);
  }
  return translations[key] ?? key;
}
