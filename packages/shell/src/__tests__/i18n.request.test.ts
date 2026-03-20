/**
 * Tests for src/i18n.ts — the next-intl request config.
 *
 * We test the exported `resolveLocale` helper directly since the
 * `getRequestConfig` default export depends on next.js server internals
 * (headers(), next/headers) that are unavailable in Vitest.
 */
import { describe, it, expect } from 'vitest';
import { resolveLocale, defaultLocale } from '../i18n';

describe('resolveLocale()', () => {
  it('returns the default locale when the header is empty', () => {
    expect(resolveLocale('')).toBe(defaultLocale);
  });

  it('returns the default locale when the header is whitespace', () => {
    expect(resolveLocale('   ')).toBe(defaultLocale);
  });

  it('returns "en" for a simple English Accept-Language header', () => {
    expect(resolveLocale('en')).toBe('en');
  });

  it('returns "en" for en-US', () => {
    expect(resolveLocale('en-US')).toBe('en');
  });

  it('returns "en" for en-GB', () => {
    expect(resolveLocale('en-GB')).toBe('en');
  });

  it('returns default locale for an unsupported language like French', () => {
    expect(resolveLocale('fr')).toBe(defaultLocale);
  });

  it('returns default locale for an unsupported language like Japanese', () => {
    expect(resolveLocale('ja')).toBe(defaultLocale);
  });

  it('returns "en" when en is second preference after unsupported language', () => {
    // fr is unsupported, en is supported — should fall through to en
    expect(resolveLocale('fr, en;q=0.8')).toBe('en');
  });

  it('respects quality weights and picks the highest supported locale', () => {
    // de (unsupported, q=0.9), en (supported, q=0.8) — en wins among supported
    expect(resolveLocale('de;q=0.9, en;q=0.8')).toBe('en');
  });

  it('handles a full browser Accept-Language header value', () => {
    expect(resolveLocale('en-US,en;q=0.9')).toBe('en');
  });

  it('handles case-insensitive language tags', () => {
    expect(resolveLocale('EN-US')).toBe('en');
    expect(resolveLocale('EN')).toBe('en');
  });

  it('returns default locale for completely unrecognised values', () => {
    expect(resolveLocale('zz-ZZ')).toBe(defaultLocale);
  });
});
