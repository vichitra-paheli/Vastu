/**
 * Unit tests for packages/shell/src/lib/i18n.ts
 *
 * Verifies the backward-compatible `t(key)` wrapper that sources strings
 * from messages/en.json.
 *
 * Test cases align with the requirements from VASTU-1A-101:
 *   - AC-2: All existing t('key') calls work without changes
 *   - Missing keys: return the key string (no crash), log warning in dev
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { t } from '../i18n';

describe('t()', () => {
  it('returns the translated English string for a known key', () => {
    expect(t('login.title')).toBe('Welcome back');
  });

  it('returns the translated string for another known key', () => {
    expect(t('common.save')).toBe('Save');
  });

  it('returns the key itself when no translation is registered', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('returns the key itself for an empty-string key', () => {
    expect(t('')).toBe('');
  });

  it('returns all expected auth translations without falling back to key', () => {
    const authKeys = [
      'login.submit',
      'register.submit',
      'forgotPassword.submit',
      'resetPassword.submit',
      'verifyEmail.resend',
      'mfa.title',
      'sso.submit',
    ];

    for (const key of authKeys) {
      const result = t(key);
      expect(result).not.toBe(key);
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('returns all expected common translations without falling back to key', () => {
    const commonKeys = ['common.cancel', 'common.delete', 'common.edit', 'common.create'];

    for (const key of commonKeys) {
      const result = t(key);
      expect(result).not.toBe(key);
    }
  });

  it('returns all expected error translations without falling back to key', () => {
    expect(t('error.invalidCredentials')).toBe('Invalid email or password');
    expect(t('error.generic')).toBe('Something went wrong. Please try again.');
    expect(t('error.sessionExpired')).toBe('Your session has expired. Please sign in again.');
  });

  it('returns the key for a key that has a dot but is not registered', () => {
    expect(t('login.nonexistent')).toBe('login.nonexistent');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Keys that coexist as both a short form and a longer dotted form.
  // These would conflict in a nested JSON structure — flat JSON handles them.
  // ──────────────────────────────────────────────────────────────────────────

  it('returns short error.notFound and its child key error.notFound.message independently', () => {
    const shortForm = t('error.notFound');
    const childForm = t('error.notFound.message');

    expect(shortForm).toBe('Page not found');
    expect(childForm).toBe('The page you are looking for does not exist or may have been moved.');
    // They are different strings — neither falls back to the key
    expect(shortForm).not.toBe('error.notFound');
    expect(childForm).not.toBe('error.notFound.message');
  });

  it('returns short error.serverError and its child key error.serverError.message independently', () => {
    const shortForm = t('error.serverError');
    const childForm = t('error.serverError.message');

    expect(shortForm).toBe('Something went wrong');
    expect(childForm).toBe(
      'An unexpected error occurred. Try again or return to the workspace.',
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Dev-mode warning for missing keys
  // ──────────────────────────────────────────────────────────────────────────

  it('logs a console.warn for missing keys in development (NODE_ENV=test)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = t('totally.missing.key');

    expect(result).toBe('totally.missing.key');
    expect(warnSpy).toHaveBeenCalledWith('[i18n] Missing translation key: "totally.missing.key"');
    warnSpy.mockRestore();
  });

  it('does NOT log a console.warn for keys that exist', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    t('login.title');

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
