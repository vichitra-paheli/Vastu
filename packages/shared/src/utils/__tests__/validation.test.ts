import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isValidEmail,
  calculatePasswordStrength,
  isValidUrl,
  isRelativeUrl,
  isValidSubdomain,
} from '../validation';
import {
  isBlockedIpv4,
  isBlockedIpv6,
  validateHostForSSRF,
  SsrfBlockedError,
} from '../validation.server';

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

// ---------------------------------------------------------------------------
// SSRF protection
// ---------------------------------------------------------------------------

describe('isBlockedIpv4', () => {
  it('blocks 10.x.x.x (RFC 1918)', () => {
    expect(isBlockedIpv4('10.0.0.1')).toBe(true);
    expect(isBlockedIpv4('10.255.255.255')).toBe(true);
  });

  it('blocks 172.16.x.x – 172.31.x.x (RFC 1918)', () => {
    expect(isBlockedIpv4('172.16.0.1')).toBe(true);
    expect(isBlockedIpv4('172.31.255.255')).toBe(true);
  });

  it('does NOT block 172.15.x.x or 172.32.x.x', () => {
    expect(isBlockedIpv4('172.15.0.1')).toBe(false);
    expect(isBlockedIpv4('172.32.0.1')).toBe(false);
  });

  it('blocks 192.168.x.x (RFC 1918)', () => {
    expect(isBlockedIpv4('192.168.0.1')).toBe(true);
    expect(isBlockedIpv4('192.168.100.200')).toBe(true);
  });

  it('blocks 127.x.x.x (loopback)', () => {
    expect(isBlockedIpv4('127.0.0.1')).toBe(true);
    expect(isBlockedIpv4('127.0.0.2')).toBe(true);
  });

  it('blocks 169.254.x.x (link-local / cloud metadata)', () => {
    expect(isBlockedIpv4('169.254.169.254')).toBe(true);
    expect(isBlockedIpv4('169.254.0.1')).toBe(true);
  });

  it('blocks 224.x.x.x and above (multicast/reserved)', () => {
    expect(isBlockedIpv4('224.0.0.1')).toBe(true);
    expect(isBlockedIpv4('255.255.255.255')).toBe(true);
  });

  it('blocks 0.x.x.x', () => {
    expect(isBlockedIpv4('0.0.0.0')).toBe(true);
  });

  it('allows public IPs', () => {
    expect(isBlockedIpv4('8.8.8.8')).toBe(false);
    expect(isBlockedIpv4('1.1.1.1')).toBe(false);
    expect(isBlockedIpv4('203.0.113.1')).toBe(false);
  });

  it('blocks unparseable strings', () => {
    expect(isBlockedIpv4('not-an-ip')).toBe(true);
    expect(isBlockedIpv4('999.0.0.0')).toBe(true);
  });
});

describe('isBlockedIpv6', () => {
  it('blocks ::1 (loopback)', () => {
    expect(isBlockedIpv6('::1')).toBe(true);
  });

  it('blocks fe80::/10 (link-local)', () => {
    expect(isBlockedIpv6('fe80::1')).toBe(true);
    expect(isBlockedIpv6('feb0::1')).toBe(true);
  });

  it('blocks fc00::/7 (unique local)', () => {
    expect(isBlockedIpv6('fc00::1')).toBe(true);
    expect(isBlockedIpv6('fd12:3456::1')).toBe(true);
  });

  it('allows public IPv6', () => {
    expect(isBlockedIpv6('2001:db8::1')).toBe(false);
    expect(isBlockedIpv6('2606:4700:4700::1111')).toBe(false);
  });
});

describe('validateHostForSSRF — literal IPs and localhost (no DNS)', () => {
  it('throws SsrfBlockedError for "localhost"', async () => {
    await expect(validateHostForSSRF('localhost')).rejects.toThrow(SsrfBlockedError);
    await expect(validateHostForSSRF('localhost')).rejects.toThrow(
      'Connection to internal/private IP addresses is not allowed',
    );
  });

  it('throws SsrfBlockedError for raw 127.0.0.1', async () => {
    await expect(validateHostForSSRF('127.0.0.1')).rejects.toThrow(SsrfBlockedError);
  });

  it('throws SsrfBlockedError for 169.254.169.254 (cloud metadata)', async () => {
    await expect(validateHostForSSRF('169.254.169.254')).rejects.toThrow(SsrfBlockedError);
  });

  it('throws SsrfBlockedError for 10.0.0.1', async () => {
    await expect(validateHostForSSRF('10.0.0.1')).rejects.toThrow(SsrfBlockedError);
  });

  it('throws SsrfBlockedError for 192.168.1.1', async () => {
    await expect(validateHostForSSRF('192.168.1.1')).rejects.toThrow(SsrfBlockedError);
  });

  it('throws SsrfBlockedError for ::1 (IPv6 loopback)', async () => {
    await expect(validateHostForSSRF('::1')).rejects.toThrow(SsrfBlockedError);
  });

  it('allows a public IPv4 address without DNS lookup', async () => {
    await expect(validateHostForSSRF('8.8.8.8')).resolves.toBeUndefined();
  });
});

// DNS-resolution tests use vi.doMock + vi.resetModules so each test gets its
// own fresh module instance with an independent dns mock. vi.mock() is hoisted
// and only the last factory wins per file, so we cannot use it inside it() blocks.
describe('validateHostForSSRF — DNS resolution checks', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('throws SsrfBlockedError when hostname resolves only to private IPs', async () => {
    vi.doMock('dns', () => ({
      default: {
        promises: {
          resolve4: vi.fn().mockResolvedValue(['10.0.0.5']),
          resolve6: vi.fn().mockRejectedValue(new Error('ENODATA')),
        },
      },
    }));

    const { validateHostForSSRF: fn } = await import('../validation.server');
    await expect(fn('evil.internal.example')).rejects.toThrow(/blocked|private|internal|no addresses/i);
  });

  it('allows a hostname that resolves to a public IP', async () => {
    vi.doMock('dns', () => ({
      default: {
        promises: {
          resolve4: vi.fn().mockResolvedValue(['93.184.216.34']),
          resolve6: vi.fn().mockRejectedValue(new Error('ENODATA')),
        },
      },
    }));

    const { validateHostForSSRF: fn } = await import('../validation.server');
    await expect(fn('example.com')).resolves.toBeUndefined();
  });

  it('throws SsrfBlockedError when hostname resolves to 169.254.169.254 (DNS rebinding to metadata endpoint)', async () => {
    vi.doMock('dns', () => ({
      default: {
        promises: {
          resolve4: vi.fn().mockResolvedValue(['169.254.169.254']),
          resolve6: vi.fn().mockRejectedValue(new Error('ENODATA')),
        },
      },
    }));

    const { validateHostForSSRF: fn, SsrfBlockedError: Err } = await import('../validation.server');
    await expect(fn('metadata.attacker.example')).rejects.toThrow(Err);
  });
});
