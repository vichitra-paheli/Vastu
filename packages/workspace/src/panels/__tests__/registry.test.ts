/**
 * Unit tests for the panel registry.
 *
 * Tests cover:
 * - registerPanel / getPanel / getAllPanels
 * - Duplicate registration throws
 * - Unknown IDs return undefined
 * - clearRegistry resets state for subsequent tests
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  registerPanel,
  getPanel,
  getAllPanels,
  unregisterPanel,
  clearRegistry,
} from '../registry';
import type { PanelDefinition } from '../../types/panel';

// Minimal stub component for test registrations
const StubComponent = () => React.createElement('div', null, 'stub');

function makeDefinition(id: string): PanelDefinition {
  return {
    id,
    title: `Panel ${id}`,
    component: StubComponent,
  };
}

describe('panelRegistry', () => {
  // Clear the registry before and after each test to avoid state leakage
  beforeEach(() => clearRegistry());
  afterEach(() => clearRegistry());

  describe('registerPanel', () => {
    it('registers a panel definition', () => {
      const def = makeDefinition('test-panel');
      registerPanel(def);
      expect(getPanel('test-panel')).toBe(def);
    });

    it('throws when registering a duplicate ID', () => {
      registerPanel(makeDefinition('dupe-panel'));
      expect(() => registerPanel(makeDefinition('dupe-panel'))).toThrow(
        /already registered/,
      );
    });

    it('allows registering multiple distinct panels', () => {
      registerPanel(makeDefinition('panel-a'));
      registerPanel(makeDefinition('panel-b'));
      expect(getPanel('panel-a')?.id).toBe('panel-a');
      expect(getPanel('panel-b')?.id).toBe('panel-b');
    });
  });

  describe('getPanel', () => {
    it('returns undefined for an unregistered ID', () => {
      expect(getPanel('nonexistent')).toBeUndefined();
    });

    it('returns the registered definition', () => {
      const def = makeDefinition('my-panel');
      registerPanel(def);
      const result = getPanel('my-panel');
      expect(result).toBe(def);
      expect(result?.title).toBe('Panel my-panel');
    });
  });

  describe('getAllPanels', () => {
    it('returns an empty array when nothing is registered', () => {
      expect(getAllPanels()).toEqual([]);
    });

    it('returns all registered panels', () => {
      registerPanel(makeDefinition('a'));
      registerPanel(makeDefinition('b'));
      registerPanel(makeDefinition('c'));
      const all = getAllPanels();
      expect(all).toHaveLength(3);
      expect(all.map((d) => d.id).sort()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('unregisterPanel', () => {
    it('removes a registered panel', () => {
      registerPanel(makeDefinition('removable'));
      unregisterPanel('removable');
      expect(getPanel('removable')).toBeUndefined();
    });

    it('is a no-op for unregistered IDs', () => {
      expect(() => unregisterPanel('nonexistent')).not.toThrow();
    });
  });

  describe('clearRegistry', () => {
    it('removes all panels', () => {
      registerPanel(makeDefinition('x'));
      registerPanel(makeDefinition('y'));
      clearRegistry();
      expect(getAllPanels()).toHaveLength(0);
    });
  });
});
