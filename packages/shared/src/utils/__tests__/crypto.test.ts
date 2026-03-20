import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateApiKey, hashApiKey, generateToken, encrypt, decrypt } from '../crypto';

describe('generateApiKey', () => {
  it('returns key, prefix, and hash', () => {
    const result = generateApiKey();
    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('prefix');
    expect(result).toHaveProperty('hash');
  });

  it('key starts with sk_live_', () => {
    const { key } = generateApiKey();
    expect(key).toMatch(/^sk_live_[0-9a-f]{64}$/);
  });

  it('prefix is the first 12 characters of the key', () => {
    const { key, prefix } = generateApiKey();
    expect(prefix).toBe(key.substring(0, 12));
  });

  it('hash matches the key when hashed independently', () => {
    const { key, hash } = generateApiKey();
    expect(hash).toBe(hashApiKey(key));
  });

  it('generates unique keys each call', () => {
    const first = generateApiKey();
    const second = generateApiKey();
    expect(first.key).not.toBe(second.key);
    expect(first.hash).not.toBe(second.hash);
  });
});

describe('hashApiKey', () => {
  it('produces a consistent SHA-256 hex hash', () => {
    const key = 'sk_live_test_key';
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
  });

  it('produces a 64-character hex string', () => {
    const hash = hashApiKey('any-key');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different keys', () => {
    expect(hashApiKey('key-a')).not.toBe(hashApiKey('key-b'));
  });
});

describe('generateToken', () => {
  it('returns a hex string of the correct length (default 32 bytes = 64 chars)', () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns a hex string for a custom byte length', () => {
    const token = generateToken(16);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generates unique tokens each call', () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });
});

describe('encrypt / decrypt', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = originalKey;
    }
  });

  it('round-trips plaintext correctly', () => {
    const plaintext = 'super-secret-password';
    const ciphertext = encrypt(plaintext);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('round-trips with a 64-char hex key', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    const plaintext = 'another secret';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const plaintext = 'hello';
    const c1 = encrypt(plaintext);
    const c2 = encrypt(plaintext);
    expect(c1).not.toBe(c2);
  });

  it('round-trips empty string', () => {
    expect(decrypt(encrypt(''))).toBe('');
  });

  it('round-trips unicode content', () => {
    const plaintext = 'password with unicode: \u4e2d\u6587\u5185\u5bb9';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('throws when ENCRYPTION_KEY is not set', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is required');
  });
});
