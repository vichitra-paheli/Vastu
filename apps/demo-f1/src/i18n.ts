/**
 * next-intl request configuration for demo-f1.
 *
 * Sets up locale detection and message loading for the current request.
 * Referenced in next.config.mjs via the createNextIntlPlugin wrapper.
 *
 * Vastu does NOT use locale-prefixed URLs. Locale is detected from the
 * Accept-Language header.
 */

import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

/** Locales supported by the application. */
export const locales = ['en'] as const;

/** The default locale used when no match is found. */
export const defaultLocale = 'en' as const;

export type SupportedLocale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const acceptLanguage = (await headers()).get('Accept-Language') ?? '';
  const locale = resolveLocale(acceptLanguage);

  let messages: Record<string, string>;
  try {
    const mod = (await import(`../messages/${locale}.json`)) as {
      default: Record<string, string>;
    };
    messages = mod.default;
  } catch {
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
 */
export function resolveLocale(acceptLanguageHeader: string): SupportedLocale {
  if (!acceptLanguageHeader.trim()) {
    return defaultLocale;
  }

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
    const primary = tag.split('-')[0]?.toLowerCase();
    if (primary && (locales as readonly string[]).includes(primary)) {
      return primary as SupportedLocale;
    }
  }

  return defaultLocale;
}
