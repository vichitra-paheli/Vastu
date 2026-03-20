/**
 * next-intl request configuration (i18n/request.ts equivalent).
 *
 * This file is used by next-intl's App Router integration to set up locale
 * detection and load messages for the current request. It is referenced in
 * next.config.js via the createNextIntlPlugin wrapper.
 *
 * Vastu does NOT use locale-prefixed URLs (e.g. /en/dashboard). Instead,
 * locale is detected from the Accept-Language header. This approach is called
 * "without i18n routing" in the next-intl docs.
 *
 * Phase 1 only supports English. Additional locales will be added in a future
 * phase when a language switcher is introduced in the appearance settings.
 */

import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

/** Locales supported by the application. */
export const locales = ['en'] as const;

/** The default locale used when no match is found. */
export const defaultLocale = 'en' as const;

export type SupportedLocale = (typeof locales)[number];

export default getRequestConfig(async () => {
  // Parse Accept-Language header and find the best supported locale.
  const acceptLanguage = (await headers()).get('Accept-Language') ?? '';
  const locale = resolveLocale(acceptLanguage);

  // Messages are loaded dynamically so that only the required locale bundle
  // is fetched. Currently only `en` exists; additional locales will add files
  // under packages/shell/messages/{locale}.json.
  //
  // The messages file uses flat dot-notation keys (e.g. "login.title": "...").
  // This matches the existing t('key') call pattern throughout the codebase.
  let messages: Record<string, string>;
  try {
    const mod = (await import(`../messages/${locale}.json`)) as {
      default: Record<string, string>;
    };
    messages = mod.default;
  } catch {
    // Fall back to default locale if the message file is missing.
    const fallback = (await import(`../messages/${defaultLocale}.json`)) as {
      default: Record<string, string>;
    };
    messages = fallback.default;
  }

  return {
    locale,
    messages,
  };
});

/**
 * Resolve a supported locale from an Accept-Language header value.
 *
 * Parses quality-weighted language tags (e.g. "fr-CH, fr;q=0.9, en;q=0.8")
 * and returns the first tag whose primary subtag matches a supported locale.
 * Falls back to `defaultLocale` when no match is found.
 */
export function resolveLocale(acceptLanguageHeader: string): SupportedLocale {
  if (!acceptLanguageHeader.trim()) {
    return defaultLocale;
  }

  // Split into individual language tags and sort by quality weight.
  const tags = acceptLanguageHeader
    .split(',')
    .map((entry) => {
      const [tag, q] = entry.trim().split(';q=');
      return {
        tag: (tag ?? '').trim(),
        quality: q !== undefined ? parseFloat(q) : 1.0,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of tags) {
    // Match on primary subtag (e.g. "en" from "en-US").
    const primary = tag.split('-')[0]?.toLowerCase();
    if (primary && (locales as readonly string[]).includes(primary)) {
      return primary as SupportedLocale;
    }
  }

  return defaultLocale;
}
