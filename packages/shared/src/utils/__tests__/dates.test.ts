import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { relativeTime, formatDate, formatDateTime, formatTimestamp } from '../dates';

describe('relativeTime', () => {
  beforeEach(() => {
    // Pin "now" to 2024-03-18T14:30:00.000Z
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-18T14:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for a date less than 60 seconds ago', () => {
    const date = new Date('2024-03-18T14:29:30.000Z'); // 30s ago
    expect(relativeTime(date)).toBe('just now');
  });

  it('returns minutes ago for a date 2-59 minutes ago', () => {
    const date = new Date('2024-03-18T14:28:00.000Z'); // 2m ago
    expect(relativeTime(date)).toBe('2m ago');
  });

  it('returns hours ago for a date 1-23 hours ago', () => {
    const date = new Date('2024-03-18T11:30:00.000Z'); // 3h ago
    expect(relativeTime(date)).toBe('3h ago');
  });

  it('returns days ago for a date 1-6 days ago', () => {
    const date = new Date('2024-03-16T14:30:00.000Z'); // 2d ago
    expect(relativeTime(date)).toBe('2d ago');
  });

  it('returns weeks ago for a date 1-3 weeks ago', () => {
    const date = new Date('2024-03-04T14:30:00.000Z'); // 14d = 2w ago
    expect(relativeTime(date)).toBe('2w ago');
  });

  it('returns months ago for a date 1-11 months ago', () => {
    const date = new Date('2024-01-18T14:30:00.000Z'); // ~59d ago
    const result = relativeTime(date);
    // Could be 1mo or 2mo depending on exact day count / 30
    expect(result).toMatch(/\dmo ago/);
  });

  it('returns formatted date for a date more than 12 months ago', () => {
    const date = new Date('2022-06-15T12:00:00.000Z'); // over 1 year ago
    const result = relativeTime(date);
    // Should fall back to formatDate — contains year
    expect(result).toContain('2022');
  });

  it('accepts a string date', () => {
    expect(relativeTime('2024-03-18T14:29:30.000Z')).toBe('just now');
  });
});

describe('formatDate', () => {
  it('formats a Date object as "Mon D, YYYY"', () => {
    const result = formatDate(new Date('2024-03-18T12:00:00.000Z'));
    expect(result).toContain('2024');
    expect(result).toContain('Mar');
  });

  it('accepts a string date', () => {
    const result = formatDate('2024-01-05T00:00:00.000Z');
    expect(result).toContain('2024');
  });
});

describe('formatDateTime', () => {
  it('includes the year, month, day, and time', () => {
    const result = formatDateTime(new Date('2024-03-18T14:30:00.000Z'));
    expect(result).toContain('2024');
    // Should include AM or PM
    expect(result).toMatch(/AM|PM/);
  });

  it('accepts a string date', () => {
    const result = formatDateTime('2024-03-18T14:30:00.000Z');
    expect(result).toContain('2024');
  });
});

describe('formatTimestamp', () => {
  it('formats as "YYYY-MM-DD HH:MM:SS" (19 chars)', () => {
    const result = formatTimestamp(new Date('2024-03-18T14:30:05.000Z'));
    expect(result).toBe('2024-03-18 14:30:05');
    expect(result).toHaveLength(19);
  });

  it('accepts a string date', () => {
    const result = formatTimestamp('2024-01-01T00:00:00.000Z');
    expect(result).toBe('2024-01-01 00:00:00');
  });

  it('pads seconds correctly', () => {
    const result = formatTimestamp(new Date('2024-03-18T08:05:03.000Z'));
    expect(result).toBe('2024-03-18 08:05:03');
  });
});
