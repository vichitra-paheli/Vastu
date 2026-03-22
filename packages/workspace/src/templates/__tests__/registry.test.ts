/**
 * Unit tests for the template registry.
 *
 * Tests cover:
 * - registerTemplate / getTemplate / getRegisteredTemplates
 * - Duplicate registration throws
 * - Unknown types return undefined
 * - clearTemplateRegistry resets state between tests
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  registerTemplate,
  getTemplate,
  getRegisteredTemplates,
  unregisterTemplate,
  clearTemplateRegistry,
} from '../registry';
import type { TemplateMeta } from '../registry';
import type { TemplateProps, TemplateType } from '../types';

// Minimal stub component for test registrations
const StubTemplate = (_props: TemplateProps) => React.createElement('div', null, 'stub');

function makeMeta(label: string): TemplateMeta {
  return {
    label,
    icon: 'IconTable',
    description: `${label} template`,
    defaultConfig: { templateType: 'table-listing' },
  };
}

describe('templateRegistry', () => {
  beforeEach(() => clearTemplateRegistry());
  afterEach(() => clearTemplateRegistry());

  describe('registerTemplate', () => {
    it('registers a template and makes it retrievable', () => {
      const meta = makeMeta('Table Listing');
      registerTemplate('table-listing', StubTemplate, meta);
      const entry = getTemplate('table-listing');
      expect(entry).toBeDefined();
      expect(entry?.component).toBe(StubTemplate);
      expect(entry?.meta.label).toBe('Table Listing');
    });

    it('throws when registering a duplicate TemplateType', () => {
      registerTemplate('table-listing', StubTemplate, makeMeta('First'));
      expect(() => registerTemplate('table-listing', StubTemplate, makeMeta('Second'))).toThrow(
        /already registered/,
      );
    });

    it('allows registering multiple distinct template types', () => {
      const types: TemplateType[] = ['table-listing', 'dashboard', 'form-page'];
      for (const type of types) {
        registerTemplate(type, StubTemplate, makeMeta(type));
      }
      for (const type of types) {
        expect(getTemplate(type)).toBeDefined();
      }
    });
  });

  describe('getTemplate', () => {
    it('returns undefined for an unregistered TemplateType', () => {
      expect(getTemplate('table-listing')).toBeUndefined();
    });

    it('returns the registered entry', () => {
      const meta = makeMeta('Summary Dashboard');
      registerTemplate('summary-dashboard', StubTemplate, meta);
      const entry = getTemplate('summary-dashboard');
      expect(entry?.meta).toBe(meta);
    });
  });

  describe('getRegisteredTemplates', () => {
    it('returns an empty array when nothing is registered', () => {
      expect(getRegisteredTemplates()).toEqual([]);
    });

    it('returns one entry per registered template including the type', () => {
      registerTemplate('table-listing', StubTemplate, makeMeta('Table'));
      registerTemplate('dashboard', StubTemplate, makeMeta('Dashboard'));
      const all = getRegisteredTemplates();
      expect(all).toHaveLength(2);
      const types = all.map((e) => e.type).sort();
      expect(types).toEqual(['dashboard', 'table-listing']);
    });

    it('each entry contains type, component, and meta', () => {
      const meta = makeMeta('Form');
      registerTemplate('form-page', StubTemplate, meta);
      const [entry] = getRegisteredTemplates();
      expect(entry.type).toBe('form-page');
      expect(entry.component).toBe(StubTemplate);
      expect(entry.meta).toBe(meta);
    });
  });

  describe('unregisterTemplate', () => {
    it('removes a registered template', () => {
      registerTemplate('timeline-activity', StubTemplate, makeMeta('Timeline'));
      unregisterTemplate('timeline-activity');
      expect(getTemplate('timeline-activity')).toBeUndefined();
    });

    it('is a no-op for unregistered types', () => {
      expect(() => unregisterTemplate('data-explorer')).not.toThrow();
    });
  });

  describe('clearTemplateRegistry', () => {
    it('removes all registered templates', () => {
      registerTemplate('table-listing', StubTemplate, makeMeta('A'));
      registerTemplate('dashboard', StubTemplate, makeMeta('B'));
      clearTemplateRegistry();
      expect(getRegisteredTemplates()).toHaveLength(0);
    });
  });
});
