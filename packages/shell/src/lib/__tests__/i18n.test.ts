import { describe, it, expect } from 'vitest';
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
});
