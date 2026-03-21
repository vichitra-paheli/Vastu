/**
 * FilterSystem types utility function tests.
 */

import { describe, it, expect } from 'vitest';
import {
  createRootGroup,
  createCondition,
  isFilterFlat,
  countConditions,
} from '../types';
import type { FilterGroup } from '../types';

describe('createRootGroup', () => {
  it('creates an AND root group with no children', () => {
    const root = createRootGroup();
    expect(root.type).toBe('group');
    expect(root.connector).toBe('AND');
    expect(root.children).toHaveLength(0);
  });
});

describe('createCondition', () => {
  it('creates text condition with empty array value', () => {
    const c = createCondition('name', 'text');
    expect(c.column).toBe('name');
    expect(c.dataType).toBe('text');
    expect(c.mode).toBe('include');
    expect(c.value).toEqual([]);
  });

  it('creates enum condition with empty array value', () => {
    const c = createCondition('status', 'enum');
    expect(c.value).toEqual([]);
  });

  it('creates number condition with empty object value', () => {
    const c = createCondition('amount', 'number');
    expect(c.value).toEqual({});
  });

  it('creates date condition with empty object value', () => {
    const c = createCondition('date', 'date');
    expect(c.value).toEqual({});
  });

  it('creates boolean condition with null value (any)', () => {
    const c = createCondition('active', 'boolean');
    expect(c.value).toBeNull();
  });

  it('creates regex condition with empty string value', () => {
    const c = createCondition('name', 'text', 'regex');
    expect(c.value).toBe('');
  });

  it('respects explicit mode', () => {
    const c = createCondition('name', 'text', 'exclude');
    expect(c.mode).toBe('exclude');
  });
});

describe('isFilterFlat', () => {
  it('returns true for null root', () => {
    expect(isFilterFlat(null)).toBe(true);
  });

  it('returns true for root with only conditions', () => {
    const root: FilterGroup = {
      type: 'group',
      connector: 'AND',
      children: [
        createCondition('name', 'text'),
        createCondition('status', 'enum'),
      ],
    };
    expect(isFilterFlat(root)).toBe(true);
  });

  it('returns false when root has nested groups', () => {
    const root: FilterGroup = {
      type: 'group',
      connector: 'AND',
      children: [
        createCondition('name', 'text'),
        {
          type: 'group',
          connector: 'OR',
          children: [createCondition('status', 'enum')],
        },
      ],
    };
    expect(isFilterFlat(root)).toBe(false);
  });
});

describe('countConditions', () => {
  it('returns 0 for null', () => {
    expect(countConditions(null)).toBe(0);
  });

  it('counts a single condition', () => {
    const c = createCondition('name', 'text');
    expect(countConditions(c)).toBe(1);
  });

  it('counts all conditions in a flat group', () => {
    const root: FilterGroup = {
      type: 'group',
      connector: 'AND',
      children: [
        createCondition('name', 'text'),
        createCondition('status', 'enum'),
        createCondition('amount', 'number'),
      ],
    };
    expect(countConditions(root)).toBe(3);
  });

  it('counts conditions recursively in nested groups', () => {
    const root: FilterGroup = {
      type: 'group',
      connector: 'AND',
      children: [
        createCondition('name', 'text'),
        {
          type: 'group',
          connector: 'OR',
          children: [
            createCondition('status', 'enum'),
            createCondition('amount', 'number'),
          ],
        },
      ],
    };
    expect(countConditions(root)).toBe(3);
  });
});
