/**
 * i18n — workspace package translation helper.
 *
 * Synchronous t(key, params?) wrapper over a flat translations record.
 * Workspace-specific keys live in messages/en.json at the workspace root.
 *
 * For keys used across shell + workspace, reference the shell's messages/en.json.
 * Keys are namespaced by feature: 'workspace.welcome.title', etc.
 *
 * Returns the key itself when no translation is found, making missing
 * translations easy to spot during development without crashing.
 *
 * Named interpolation is supported via the optional `params` argument:
 *   t('view.selector.deleteDescription', { name: 'My View' })
 *   // message template: "Delete view '{name}'. This cannot be undone."
 *   // result: "Delete view 'My View'. This cannot be undone."
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const translations = require('../../messages/en.json') as Record<string, string>;

/**
 * Translate a workspace key to its English string.
 * All user-facing strings must use this function for future i18n support.
 *
 * @param key - The translation key.
 * @param params - Optional named parameters for interpolation.
 *   Each `{paramName}` placeholder in the message is replaced with the
 *   corresponding value from `params`.
 */
export function t(key: string, params?: Record<string, string>): string {
  if (process.env.NODE_ENV !== 'production' && translations[key] === undefined) {
    console.warn(`[i18n/workspace] Missing translation key: "${key}"`);
  }
  let message = translations[key] ?? key;
  if (params) {
    for (const [param, value] of Object.entries(params)) {
      message = message.replace(`{${param}}`, value);
    }
  }
  return message;
}
