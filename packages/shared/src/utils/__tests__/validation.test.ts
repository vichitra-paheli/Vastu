import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  calculatePasswordStrength,
  isValidUrl,
  isRelativeUrl,
  isValidSubdomain,
} from '../validation';

describe('isValidEmail', () => {
  it('returns true for a valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('returns true for email with subdomains', () => {
    expect(isValidEmail('user@mail.example.co.uk')).toBe(true);
  });

  it('returns true for email with plus addressing', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('returns false for missing @', () => {
    expect(isValidEmail('notanemail.com')).toBe(false);
  });

  it('returns false for missing domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('returns false for missing local part', () => {
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('returns false for email with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('calculatePasswordStrength', () => {
  it('returns weak for short password with no complexity', () => {
    const result = calculatePasswordStrength('abc');
    expect(result.strength).toBe('weak');
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('returns fair for 8-char with digit', () => {
    // score: length>=8 (1) + digit (1) = 2 total -> fair
    const result2 = calculatePasswordStrength('abcdefg1');
    expect(result2.strength).toBe('fair');
    expect(result2.score).toBe(2);
  });

  it('returns good for mixed case + digit', () => {
    const result = calculatePasswordStrength('Abcdefg1');
    // length>=8 (1) + mixed case (1) + digit (1) = 3 -> good
    expect(result.strength).toBe('good');
    expect(result.score).toBe(3);
  });

  it('returns strong for long password with all criteria', () => {
    const result = calculatePasswordStrength('Abcdefg123!');
    // length>=8 (1) + length>=12? no (0) + mixed case (1) + digit (1) + special (1) = 4 -> strong
    expect(result.strength).toBe('strong');
    expect(result.score).toBeGreaterThanOrEqual(4);
  });

  it('returns strong for 12+ char password with all criteria', () => {
    const result = calculatePasswordStrength('Abcdefgh1234!');
    // length>=8 (1) + length>=12 (1) + mixed case (1) + digit (1) + special (1) = 5 -> strong
    expect(result.strength).toBe('strong');
    expect(result.score).toBe(5);
  });

  it('returns weak for empty password', () => {
    const result = calculatePasswordStrength('');
    expect(result.strength).toBe('weak');
    expect(result.score).toBe(0);
  });
});

describe('isValidUrl', () => {
  it('returns true for a valid http URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('returns true for a valid https URL', () => {
    expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
  });

  it('returns false for a relative URL', () => {
    expect(isValidUrl('/relative/path')).toBe(false);
  });

  it('returns false for plain text', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });
});

describe('isRelativeUrl', () => {
  it('returns true for a simple relative path', () => {
    expect(isRelativeUrl('/foo')).toBe(true);
  });

  it('returns true for a nested relative path', () => {
    expect(isRelativeUrl('/settings/profile')).toBe(true);
  });

  it('returns false for protocol-relative URL (open redirect risk)', () => {
    expect(isRelativeUrl('//evil.com')).toBe(false);
  });

  it('returns false for absolute https URL', () => {
    expect(isRelativeUrl('https://example.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isRelativeUrl('')).toBe(false);
  });
});

describe('isValidSubdomain', () => {
  it('returns true for a valid lowercase subdomain', () => {
    expect(isValidSubdomain('acme')).toBe(true);
  });

  it('returns true for subdomain with hyphens', () => {
    expect(isValidSubdomain('my-team')).toBe(true);
  });

  it('returns true for subdomain with numbers', () => {
    expect(isValidSubdomain('team123')).toBe(true);
  });

  it('returns false for subdomain starting with hyphen', () => {
    expect(isValidSubdomain('-acme')).toBe(false);
  });

  it('returns false for subdomain ending with hyphen', () => {
    expect(isValidSubdomain('acme-')).toBe(false);
  });

  it('returns false for subdomain with uppercase letters', () => {
    expect(isValidSubdomain('Acme')).toBe(false);
  });

  it('returns false for subdomain with spaces', () => {
    expect(isValidSubdomain('my team')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidSubdomain('')).toBe(false);
  });
});
