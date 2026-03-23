/**
 * registry.test.ts — unit tests for the page registry.
 *
 * Tests cover: register, getAll, getById, ordering, static vs dynamic merge,
 * and error/edge cases.
 *
 * Implements VASTU-2A-206f.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerPage,
  getAllPages,
  getPageById,
  mergeWithDynamic,
  unregisterPage,
  clearPageRegistry,
} from '../registry';
import type { PageDefinition } from '../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const racesPage: PageDefinition = {
  id: 'races',
  name: 'Races',
  icon: 'Flag',
  template: 'table-listing',
  section: 'pages',
  order: 1,
};

const driversPage: PageDefinition = {
  id: 'drivers',
  name: 'Drivers',
  icon: 'Users',
  template: 'table-listing',
  section: 'pages',
  order: 2,
};

const dashboardPage: PageDefinition = {
  id: 'my-dashboard',
  name: 'My Dashboard',
  icon: 'LayoutDashboard',
  template: 'dashboard',
  section: 'pages',
  order: 0,
};

const settingsPage: PageDefinition = {
  id: 'settings-page',
  name: 'Settings',
  icon: 'Settings',
  template: 'form-page',
  section: 'system',
  order: 1,
};

const adminPage: PageDefinition = {
  id: 'admin-overview',
  name: 'Admin Overview',
  icon: 'ShieldCog',
  template: 'summary-dashboard',
  section: 'admin',
  order: 1,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  clearPageRegistry();
});

// ---------------------------------------------------------------------------
// registerPage
// ---------------------------------------------------------------------------

describe('registerPage', () => {
  it('registers a page definition without error', () => {
    expect(() => registerPage(racesPage)).not.toThrow();
  });

  it('throws when a duplicate ID is registered', () => {
    registerPage(racesPage);
    expect(() => registerPage({ ...racesPage })).toThrow(
      '[pageRegistry] Page "races" is already registered.',
    );
  });

  it('includes the duplicate ID in the error message', () => {
    registerPage(driversPage);
    expect(() => registerPage(driversPage)).toThrow('"drivers"');
  });
});

// ---------------------------------------------------------------------------
// getPageById
// ---------------------------------------------------------------------------

describe('getPageById', () => {
  it('returns the definition for a registered page', () => {
    registerPage(racesPage);
    expect(getPageById('races')).toEqual(racesPage);
  });

  it('returns undefined for an unknown ID', () => {
    expect(getPageById('unknown-page')).toBeUndefined();
  });

  it('returns undefined before any pages are registered', () => {
    expect(getPageById('races')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getAllPages
// ---------------------------------------------------------------------------

describe('getAllPages', () => {
  it('returns an empty array when no pages are registered', () => {
    expect(getAllPages()).toEqual([]);
  });

  it('returns all registered pages', () => {
    registerPage(racesPage);
    registerPage(driversPage);
    const all = getAllPages();
    expect(all).toHaveLength(2);
  });

  it('sorts pages by section priority: pages → system → admin', () => {
    registerPage(adminPage);
    registerPage(settingsPage);
    registerPage(racesPage);

    const all = getAllPages();
    const sections = all.map((p) => p.section ?? 'pages');
    expect(sections).toEqual(['pages', 'system', 'admin']);
  });

  it('sorts pages within the same section by order ascending', () => {
    registerPage(driversPage);   // order 2
    registerPage(racesPage);     // order 1
    registerPage(dashboardPage); // order 0

    const pagesSection = getAllPages().filter((p) => p.section === 'pages');
    expect(pagesSection.map((p) => p.id)).toEqual([
      'my-dashboard', // order 0
      'races',        // order 1
      'drivers',      // order 2
    ]);
  });

  it('sorts pages without an order after those with an explicit order', () => {
    const noOrderPage: PageDefinition = {
      id: 'no-order',
      name: 'No Order',
      icon: 'Star',
      template: 'table-listing',
      section: 'pages',
    };
    registerPage(noOrderPage);
    registerPage(racesPage); // order 1

    const pagesSection = getAllPages();
    expect(pagesSection[0].id).toBe('races');
    expect(pagesSection[1].id).toBe('no-order');
  });

  it('sorts pages with the same order alphabetically by name', () => {
    const zzPage: PageDefinition = { id: 'zz', name: 'ZZ Page', icon: 'Z', template: 'table-listing', section: 'pages', order: 5 };
    const aaPage: PageDefinition = { id: 'aa', name: 'AA Page', icon: 'A', template: 'table-listing', section: 'pages', order: 5 };
    registerPage(zzPage);
    registerPage(aaPage);

    const sorted = getAllPages();
    expect(sorted[0].id).toBe('aa');
    expect(sorted[1].id).toBe('zz');
  });

  it('does not mutate the registry when the returned array is modified', () => {
    registerPage(racesPage);
    const first = getAllPages();
    first.push(driversPage as PageDefinition);
    const second = getAllPages();
    expect(second).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// mergeWithDynamic
// ---------------------------------------------------------------------------

describe('mergeWithDynamic', () => {
  it('returns an empty array when no pages are registered and no dynamic pages supplied', () => {
    expect(mergeWithDynamic([])).toEqual([]);
  });

  it('returns static pages with isStatic: true when no dynamic pages exist', () => {
    registerPage(racesPage);
    const merged = mergeWithDynamic([]);
    expect(merged).toHaveLength(1);
    expect(merged[0].isStatic).toBe(true);
    expect(merged[0].id).toBe('races');
  });

  it('marks static pages isStatic: true', () => {
    registerPage(racesPage);
    registerPage(driversPage);
    const merged = mergeWithDynamic([]);
    expect(merged.every((p) => p.isStatic)).toBe(true);
  });

  it('appends dynamic-only pages after static pages with isStatic: false', () => {
    registerPage(racesPage);

    const dynamicOnly = {
      id: 'custom-report',
      name: 'Custom Report',
      icon: 'FileText',
      template: 'table-listing' as const,
      section: 'pages' as const,
      order: 99,
    };

    const merged = mergeWithDynamic([dynamicOnly]);
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe('races');
    expect(merged[0].isStatic).toBe(true);
    expect(merged[1].id).toBe('custom-report');
    expect(merged[1].isStatic).toBe(false);
  });

  it('merges static default config with DB override — DB wins on overlap', () => {
    const pageWithConfig: PageDefinition = {
      ...racesPage,
      config: {
        templateType: 'table-listing',
        metadata: { pageSize: 25, theme: 'default' },
      },
    };
    registerPage(pageWithConfig);

    const dbOverride = {
      ...racesPage,
      config: {
        templateType: 'table-listing' as const,
        metadata: { pageSize: 50 }, // overrides pageSize, theme is dropped from DB
      },
    };

    const merged = mergeWithDynamic([dbOverride]);
    expect(merged[0].resolvedConfig.metadata).toEqual({ pageSize: 50 });
  });

  it('uses static default config when no DB override exists for the page', () => {
    const pageWithConfig: PageDefinition = {
      ...racesPage,
      config: {
        templateType: 'table-listing',
        metadata: { pageSize: 25 },
      },
    };
    registerPage(pageWithConfig);

    const merged = mergeWithDynamic([]);
    expect(merged[0].resolvedConfig.metadata).toEqual({ pageSize: 25 });
  });

  it('sets resolvedConfig to empty object for static pages with no config', () => {
    registerPage(racesPage); // no config property
    const merged = mergeWithDynamic([]);
    expect(merged[0].resolvedConfig).toEqual({});
  });

  it('does not include static page metadata in dynamic-only pages', () => {
    registerPage(racesPage);

    const dynamicOnly = {
      id: 'dynamic-1',
      name: 'Dynamic One',
      icon: 'Star',
      template: 'table-listing' as const,
      section: 'pages' as const,
    };

    const merged = mergeWithDynamic([dynamicOnly]);
    const dynamic = merged.find((p) => p.id === 'dynamic-1');
    expect(dynamic?.isStatic).toBe(false);
  });

  it('static pages appear before dynamic-only pages regardless of order values', () => {
    const staticPage: PageDefinition = {
      id: 'static-late',
      name: 'Static Late',
      icon: 'Star',
      template: 'table-listing',
      section: 'pages',
      order: 999,
    };
    registerPage(staticPage);

    const earlyDynamic = {
      id: 'dynamic-early',
      name: 'Dynamic Early',
      icon: 'Star',
      template: 'table-listing' as const,
      section: 'pages' as const,
      order: 1,
    };

    const merged = mergeWithDynamic([earlyDynamic]);
    expect(merged[0].isStatic).toBe(true);
    expect(merged[1].isStatic).toBe(false);
  });

  it('does not mutate the registry or dynamic input array', () => {
    registerPage(racesPage);
    const dynamic = [{ ...driversPage, config: undefined }];
    mergeWithDynamic(dynamic);
    expect(getAllPages()).toHaveLength(1);
    expect(dynamic).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// unregisterPage / clearPageRegistry (test helpers)
// ---------------------------------------------------------------------------

describe('unregisterPage', () => {
  it('removes a specific page from the registry', () => {
    registerPage(racesPage);
    registerPage(driversPage);
    unregisterPage('races');
    expect(getPageById('races')).toBeUndefined();
    expect(getPageById('drivers')).toBeDefined();
  });

  it('is a no-op for a non-existent ID', () => {
    expect(() => unregisterPage('does-not-exist')).not.toThrow();
  });

  it('allows re-registration after unregistering', () => {
    registerPage(racesPage);
    unregisterPage('races');
    expect(() => registerPage(racesPage)).not.toThrow();
  });
});

describe('clearPageRegistry', () => {
  it('removes all registered pages', () => {
    registerPage(racesPage);
    registerPage(driversPage);
    clearPageRegistry();
    expect(getAllPages()).toEqual([]);
  });

  it('is a no-op on an already-empty registry', () => {
    expect(() => clearPageRegistry()).not.toThrow();
    expect(getAllPages()).toEqual([]);
  });
});
