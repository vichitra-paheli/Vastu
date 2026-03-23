/**
 * pages.test.ts — unit tests for F1 demo page registrations.
 *
 * Tests that all 9 pages are registered correctly, have valid formatter
 * references, and configure cross-page navigation intents properly.
 *
 * Implements VASTU-2A-223c.
 */

// @vitest-environment node

import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearPageRegistry,
  getAllPages,
  getPageById,
  registerBuiltinFormatters,
  clearFormatterRegistry,
} from '@vastu/workspace';
import { registerF1Formatters } from '../formatters';
import { F1_PAGE_IDS, F1_PAGES_COUNT, registerF1Pages } from '../pages';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearPageRegistry();
  clearFormatterRegistry();
  registerBuiltinFormatters();
  registerF1Formatters();
  registerF1Pages();
});

// ─── Registration count ───────────────────────────────────────────────────────

describe('F1 page registration', () => {
  it('registers the correct number of pages', () => {
    const pages = getAllPages();
    expect(pages).toHaveLength(F1_PAGES_COUNT);
  });

  it('registers all expected page IDs', () => {
    for (const id of F1_PAGE_IDS) {
      const page = getPageById(id);
      expect(page, `Page "${id}" should be registered`).toBeDefined();
    }
  });

  it('registerF1Pages is idempotent — does not throw on second call', () => {
    expect(() => registerF1Pages()).not.toThrow();
  });
});

// ─── Page identity ────────────────────────────────────────────────────────────

describe('f1-races page', () => {
  it('has correct identity fields', () => {
    const page = getPageById('f1-races');
    expect(page?.name).toBe('Races');
    expect(page?.icon).toBe('IconFlag');
    expect(page?.template).toBe('table-listing');
    expect(page?.section).toBe('pages');
    expect(page?.order).toBe(0);
  });

  it('has a prisma data source targeting Race model', () => {
    const page = getPageById('f1-races');
    expect(page?.config?.dataSource?.type).toBe('prisma');
    expect(page?.config?.dataSource?.model).toBe('Race');
  });

  it('has fields configured', () => {
    const page = getPageById('f1-races');
    expect(page?.config?.fields).toBeDefined();
    expect((page?.config?.fields ?? []).length).toBeGreaterThan(0);
  });

  it('uses weather formatter for weather field', () => {
    const page = getPageById('f1-races');
    const fieldDisplayTypes = page?.config?.metadata?.fieldDisplayTypes as
      | Record<string, string>
      | undefined;
    expect(fieldDisplayTypes?.weather).toBe('weather');
  });

  it('configures default sort by date descending', () => {
    const page = getPageById('f1-races');
    const defaultSort = page?.config?.metadata?.defaultSort as
      | Array<{ column: string; direction: string }>
      | undefined;
    expect(defaultSort?.[0]?.column).toBe('date');
    expect(defaultSort?.[0]?.direction).toBe('desc');
  });

  it('configures KPI summary strip', () => {
    const page = getPageById('f1-races');
    const summaryStrip = page?.config?.metadata?.summaryStrip as
      | { enabled: boolean }
      | undefined;
    expect(summaryStrip?.enabled).toBe(true);
  });

  it('configures row navigation to f1-race-weekend', () => {
    const page = getPageById('f1-races');
    const rowNav = page?.config?.metadata?.rowNavigateTo as
      | { targetPageId: string }
      | undefined;
    expect(rowNav?.targetPageId).toBe('f1-race-weekend');
  });
});

describe('f1-drivers page', () => {
  it('has correct identity fields', () => {
    const page = getPageById('f1-drivers');
    expect(page?.name).toBe('Drivers');
    expect(page?.icon).toBe('IconUsers');
    expect(page?.template).toBe('table-listing');
    expect(page?.order).toBe(1);
  });

  it('has a prisma data source targeting Driver model', () => {
    const page = getPageById('f1-drivers');
    expect(page?.config?.dataSource?.model).toBe('Driver');
  });

  it('uses nationality-flag formatter for nationality field', () => {
    const page = getPageById('f1-drivers');
    const fieldDisplayTypes = page?.config?.metadata?.fieldDisplayTypes as
      | Record<string, string>
      | undefined;
    expect(fieldDisplayTypes?.nationality).toBe('nationality-flag');
  });

  it('configures row navigation to f1-driver-profile', () => {
    const page = getPageById('f1-drivers');
    const rowNav = page?.config?.metadata?.rowNavigateTo as
      | { targetPageId: string }
      | undefined;
    expect(rowNav?.targetPageId).toBe('f1-driver-profile');
  });

  it('configures column navigation on last_name to f1-driver-profile', () => {
    const page = getPageById('f1-drivers');
    const colNav = page?.config?.metadata?.columnNavigateTo as
      | Record<string, { targetPageId: string }>
      | undefined;
    expect(colNav?.last_name?.targetPageId).toBe('f1-driver-profile');
  });
});

describe('f1-constructors page', () => {
  it('has correct identity fields', () => {
    const page = getPageById('f1-constructors');
    expect(page?.name).toBe('Constructors');
    expect(page?.icon).toBe('IconBuildingFactory2');
    expect(page?.template).toBe('table-listing');
    expect(page?.order).toBe(2);
  });

  it('has a prisma data source targeting Constructor model', () => {
    const page = getPageById('f1-constructors');
    expect(page?.config?.dataSource?.model).toBe('Constructor');
  });

  it('uses nationality-flag formatter for nationality field', () => {
    const page = getPageById('f1-constructors');
    const fieldDisplayTypes = page?.config?.metadata?.fieldDisplayTypes as
      | Record<string, string>
      | undefined;
    expect(fieldDisplayTypes?.nationality).toBe('nationality-flag');
  });

  it('sorts by championships descending by default', () => {
    const page = getPageById('f1-constructors');
    const defaultSort = page?.config?.metadata?.defaultSort as
      | Array<{ column: string; direction: string }>
      | undefined;
    expect(defaultSort?.[0]?.column).toBe('championships');
    expect(defaultSort?.[0]?.direction).toBe('desc');
  });
});

describe('f1-championship page', () => {
  it('has correct identity fields', () => {
    const page = getPageById('f1-championship');
    expect(page?.name).toBe('Championship');
    expect(page?.icon).toBe('IconTrophy');
    expect(page?.template).toBe('summary-dashboard');
    expect(page?.order).toBe(3);
  });

  it('has a prisma data source targeting DriverStanding model', () => {
    const page = getPageById('f1-championship');
    expect(page?.config?.dataSource?.model).toBe('DriverStanding');
  });

  it('configures a season picker', () => {
    const page = getPageById('f1-championship');
    const seasonPicker = page?.config?.metadata?.seasonPicker as
      | { enabled: boolean }
      | undefined;
    expect(seasonPicker?.enabled).toBe(true);
  });

  it('configures KPI cards', () => {
    const page = getPageById('f1-championship');
    const kpis = page?.config?.metadata?.kpis as unknown[] | undefined;
    expect(kpis).toBeDefined();
    expect((kpis ?? []).length).toBeGreaterThan(0);
  });

  it('configures charts including driver points progression', () => {
    const page = getPageById('f1-championship');
    const charts = page?.config?.metadata?.charts as Array<{ id: string }> | undefined;
    expect(charts?.some((c) => c.id === 'driver-points-progression')).toBe(true);
  });

  it('configures a mini table for latest race results', () => {
    const page = getPageById('f1-championship');
    const miniTable = page?.config?.metadata?.miniTable as
      | { id: string }
      | undefined;
    expect(miniTable?.id).toBe('latest-race-top-10');
  });
});

describe('f1-driver-profile page', () => {
  it('has correct identity fields', () => {
    const page = getPageById('f1-driver-profile');
    expect(page?.name).toBe('Driver Profile');
    expect(page?.icon).toBe('IconUser');
    expect(page?.template).toBe('multi-tab-detail');
    expect(page?.order).toBe(4);
  });

  it('has a prisma data source targeting Driver model', () => {
    const page = getPageById('f1-driver-profile');
    expect(page?.config?.dataSource?.model).toBe('Driver');
  });

  it('configures all 5 tabs', () => {
    const page = getPageById('f1-driver-profile');
    const tabs = page?.config?.metadata?.tabs as Array<{ id: string }> | undefined;
    expect(tabs).toBeDefined();
    const tabIds = (tabs ?? []).map((t) => t.id);
    expect(tabIds).toContain('overview');
    expect(tabIds).toContain('results');
    expect(tabIds).toContain('qualifying');
    expect(tabIds).toContain('penalties');
    expect(tabIds).toContain('career-timeline');
  });

  it('qualifying tab uses lap-time formatter for Q1/Q2/Q3 fields', () => {
    const page = getPageById('f1-driver-profile');
    const tabs = page?.config?.metadata?.tabs as Array<{
      id: string;
      content?: { fieldDisplayTypes?: Record<string, string> };
    }> | undefined;
    const qualifyingTab = (tabs ?? []).find((t) => t.id === 'qualifying');
    expect(qualifyingTab?.content?.fieldDisplayTypes?.q1_time_ms).toBe('lap-time');
    expect(qualifyingTab?.content?.fieldDisplayTypes?.q2_time_ms).toBe('lap-time');
    expect(qualifyingTab?.content?.fieldDisplayTypes?.q3_time_ms).toBe('lap-time');
  });

  it('results tab uses position-change, race-status, and lap-time formatters', () => {
    const page = getPageById('f1-driver-profile');
    const tabs = page?.config?.metadata?.tabs as Array<{
      id: string;
      content?: { fieldDisplayTypes?: Record<string, string> };
    }> | undefined;
    const resultsTab = (tabs ?? []).find((t) => t.id === 'results');
    expect(resultsTab?.content?.fieldDisplayTypes?.position_change).toBe('position-change');
    expect(resultsTab?.content?.fieldDisplayTypes?.status).toBe('race-status');
    expect(resultsTab?.content?.fieldDisplayTypes?.fastest_lap_time_ms).toBe('lap-time');
  });

  it('results tab navigates race name to f1-race-weekend', () => {
    const page = getPageById('f1-driver-profile');
    const tabs = page?.config?.metadata?.tabs as Array<{
      id: string;
      content?: {
        columnNavigateTo?: Record<string, { targetPageId: string }>;
      };
    }> | undefined;
    const resultsTab = (tabs ?? []).find((t) => t.id === 'results');
    expect(resultsTab?.content?.columnNavigateTo?.['race.name']?.targetPageId).toBe(
      'f1-race-weekend',
    );
  });

  it('configures entity header with titleField and badgeField', () => {
    const page = getPageById('f1-driver-profile');
    const header = page?.config?.metadata?.entityHeader as
      | { titleField: string; badgeField: string }
      | undefined;
    expect(header?.titleField).toBe('last_name');
    expect(header?.badgeField).toBe('status');
  });
});

describe('f1-lap-time-explorer page', () => {
  it('has correct identity fields', () => {
    const page = getPageById('f1-lap-time-explorer');
    expect(page?.name).toBe('Lap Time Explorer');
    expect(page?.icon).toBe('IconClock');
    expect(page?.template).toBe('data-explorer');
    expect(page?.order).toBe(5);
  });

  it('has a prisma data source targeting LapTime model', () => {
    const page = getPageById('f1-lap-time-explorer');
    expect(page?.config?.dataSource?.model).toBe('LapTime');
  });

  it('configures metric options with formatter display types', () => {
    const page = getPageById('f1-lap-time-explorer');
    const metricOptions = page?.config?.metadata?.metricOptions as Array<{
      value: string;
      displayType: string;
    }> | undefined;
    expect(metricOptions).toBeDefined();
    const lapMetric = (metricOptions ?? []).find((m) => m.value === 'avg-lap');
    expect(lapMetric?.displayType).toBe('lap-time');
    const pitMetric = (metricOptions ?? []).find((m) => m.value === 'avg-pit');
    expect(pitMetric?.displayType).toBe('pit-duration');
  });

  it('configures group-by options including circuit, driver, and tire', () => {
    const page = getPageById('f1-lap-time-explorer');
    const groupByOptions = page?.config?.metadata?.groupByOptions as Array<{
      value: string;
    }> | undefined;
    const values = (groupByOptions ?? []).map((o) => o.value);
    expect(values).toContain('race.circuit.name');
    expect(values).toContain('driver.abbreviation');
    expect(values).toContain('tire_compound');
  });

  it('has a default chart type of line', () => {
    const page = getPageById('f1-lap-time-explorer');
    expect(page?.config?.metadata?.defaultChartType).toBe('line');
  });
});

describe('f1-race-report page', () => {
  it('has correct identity fields', () => {
    const page = getPageById('f1-race-report');
    expect(page?.name).toBe('Race Report');
    expect(page?.icon).toBe('IconClipboard');
    expect(page?.template).toBe('form-page');
    expect(page?.order).toBe(6);
  });

  it('configures a wizard with 4 steps', () => {
    const page = getPageById('f1-race-report');
    const steps = page?.config?.metadata?.wizard?.steps as unknown[] | undefined;
    expect(steps).toHaveLength(4);
  });

  it('wizard steps have expected IDs', () => {
    const page = getPageById('f1-race-report');
    const steps = page?.config?.metadata?.wizard?.steps as Array<{
      id: string;
    }> | undefined;
    const stepIds = (steps ?? []).map((s) => s.id);
    expect(stepIds).toContain('select-race');
    expect(stepIds).toContain('results-grid');
    expect(stepIds).toContain('incidents');
    expect(stepIds).toContain('review');
  });

  it('review step has reviewMode: true', () => {
    const page = getPageById('f1-race-report');
    const steps = page?.config?.metadata?.wizard?.steps as Array<{
      id: string;
      reviewMode?: boolean;
    }> | undefined;
    const reviewStep = (steps ?? []).find((s) => s.id === 'review');
    expect(reviewStep?.reviewMode).toBe(true);
  });
});

describe('f1-race-weekend page', () => {
  it('has correct identity fields', () => {
    const page = getPageById('f1-race-weekend');
    expect(page?.name).toBe('Race Weekend');
    expect(page?.icon).toBe('IconCalendar');
    expect(page?.template).toBe('timeline-activity');
    expect(page?.order).toBe(7);
  });

  it('has a prisma data source targeting RaceEvent model', () => {
    const page = getPageById('f1-race-weekend');
    expect(page?.config?.dataSource?.model).toBe('RaceEvent');
  });

  it('configures timestamp and label fields', () => {
    const page = getPageById('f1-race-weekend');
    expect(page?.config?.metadata?.timestampField).toBe('timestamp');
    expect(page?.config?.metadata?.labelField).toBe('description');
  });

  it('configures a type filter with all F1 event types', () => {
    const page = getPageById('f1-race-weekend');
    const typeFilter = page?.config?.metadata?.typeFilter as
      | { enabled: boolean; options: string[] }
      | undefined;
    expect(typeFilter?.enabled).toBe(true);
    expect(typeFilter?.options).toContain('PitStop');
    expect(typeFilter?.options).toContain('SafetyCar');
    expect(typeFilter?.options).toContain('FastestLap');
  });

  it('configures event type icons for all 9 event types', () => {
    const page = getPageById('f1-race-weekend');
    const icons = page?.config?.metadata?.eventTypeIcons as
      | Record<string, string>
      | undefined;
    expect(icons).toBeDefined();
    const iconCount = Object.keys(icons ?? {}).length;
    expect(iconCount).toBe(9);
  });

  it('configures driver column navigation to f1-driver-profile', () => {
    const page = getPageById('f1-race-weekend');
    const colNav = page?.config?.metadata?.columnNavigateTo as
      | Record<string, { targetPageId: string }>
      | undefined;
    expect(colNav?.['driver.last_name']?.targetPageId).toBe('f1-driver-profile');
  });
});

describe('f1-my-dashboard page', () => {
  it('has correct identity fields', () => {
    const page = getPageById('f1-my-dashboard');
    expect(page?.name).toBe('My Dashboard');
    expect(page?.icon).toBe('IconLayoutDashboard');
    expect(page?.template).toBe('dashboard');
    expect(page?.order).toBe(8);
  });

  it('configures 4 widgets', () => {
    const page = getPageById('f1-my-dashboard');
    const widgets = page?.config?.metadata?.widgets as unknown[] | undefined;
    expect(widgets).toHaveLength(4);
  });

  it('next-race KPI widget navigates to f1-race-weekend', () => {
    const page = getPageById('f1-my-dashboard');
    const widgets = page?.config?.metadata?.widgets as Array<{
      id: string;
      navigateTo?: { targetPageId: string };
    }> | undefined;
    const nextRace = (widgets ?? []).find((w) => w.id === 'next-race');
    expect(nextRace?.navigateTo?.targetPageId).toBe('f1-race-weekend');
  });

  it('championship-leader KPI widget navigates to f1-driver-profile', () => {
    const page = getPageById('f1-my-dashboard');
    const widgets = page?.config?.metadata?.widgets as Array<{
      id: string;
      navigateTo?: { targetPageId: string };
    }> | undefined;
    const leader = (widgets ?? []).find((w) => w.id === 'championship-leader');
    expect(leader?.navigateTo?.targetPageId).toBe('f1-driver-profile');
  });

  it('latest-race-top-10 table widget uses race-status formatter', () => {
    const page = getPageById('f1-my-dashboard');
    const widgets = page?.config?.metadata?.widgets as Array<{
      id: string;
      fieldDisplayTypes?: Record<string, string>;
    }> | undefined;
    const tableWidget = (widgets ?? []).find((w) => w.id === 'latest-race-top-10');
    expect(tableWidget?.fieldDisplayTypes?.status).toBe('race-status');
  });

  it('latest-race-top-10 driver name navigates to f1-driver-profile', () => {
    const page = getPageById('f1-my-dashboard');
    const widgets = page?.config?.metadata?.widgets as Array<{
      id: string;
      columnNavigateTo?: Record<string, { targetPageId: string }>;
    }> | undefined;
    const tableWidget = (widgets ?? []).find((w) => w.id === 'latest-race-top-10');
    expect(tableWidget?.columnNavigateTo?.['driver.last_name']?.targetPageId).toBe(
      'f1-driver-profile',
    );
  });
});

// ─── Sort order ───────────────────────────────────────────────────────────────

describe('sidebar sort order', () => {
  it('pages are ordered 0–8 within the pages section', () => {
    const pages = getAllPages().filter((p) => p.section === 'pages' || !p.section);
    for (let i = 0; i < pages.length; i++) {
      expect(pages[i]?.order).toBe(i);
    }
  });

  it('Races is first, My Dashboard is last', () => {
    const pages = getAllPages();
    expect(pages[0]?.id).toBe('f1-races');
    expect(pages[pages.length - 1]?.id).toBe('f1-my-dashboard');
  });
});

// ─── Formatter reference validity ─────────────────────────────────────────────

describe('formatter references are valid', () => {
  const KNOWN_F1_FORMATTERS = new Set([
    'lap-time',
    'pit-duration',
    'tire-compound',
    'position-change',
    'race-status',
    'nationality-flag',
    'circuit-type',
    'weather',
  ]);

  function collectDisplayTypes(obj: unknown): string[] {
    if (typeof obj !== 'object' || obj === null) return [];
    const result: string[] = [];
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key === 'fieldDisplayTypes' || key === 'displayType') {
        if (typeof value === 'string') {
          result.push(value);
        } else if (typeof value === 'object' && value !== null) {
          result.push(...Object.values(value as Record<string, unknown>).filter(
            (v): v is string => typeof v === 'string',
          ));
        }
      } else {
        result.push(...collectDisplayTypes(value));
      }
    }
    return result;
  }

  it('all referenced display types are registered formatters', () => {
    // Built-in formatter types that are always valid
    const BUILTIN_FORMATTERS = new Set(['text', 'number', 'date', 'boolean', 'link', 'badge', 'avatar', 'monospace', 'currency', 'relativeDate', 'enum', 'relation']);
    const allValidTypes = new Set([...KNOWN_F1_FORMATTERS, ...BUILTIN_FORMATTERS]);

    const pages = getAllPages();
    for (const page of pages) {
      const displayTypes = collectDisplayTypes(page.config);
      for (const dt of displayTypes) {
        expect(
          allValidTypes.has(dt),
          `Page "${page.id}" references unknown displayType "${dt}"`,
        ).toBe(true);
      }
    }
  });
});

// ─── Navigation intent targets exist ──────────────────────────────────────────

describe('cross-page navigation targets are registered', () => {
  it('f1-driver-profile is navigable (referenced and registered)', () => {
    expect(getPageById('f1-driver-profile')).toBeDefined();
  });

  it('f1-race-weekend is navigable (referenced and registered)', () => {
    expect(getPageById('f1-race-weekend')).toBeDefined();
  });

  it('f1-constructors is navigable (referenced and registered)', () => {
    expect(getPageById('f1-constructors')).toBeDefined();
  });
});
