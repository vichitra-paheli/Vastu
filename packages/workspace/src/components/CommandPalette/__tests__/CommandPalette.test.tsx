/**
 * CommandPalette component tests (US-125).
 *
 * Tests cover:
 * - openCommandPalette export calls openSpotlight
 * - Search filters results correctly
 * - ">" prefix switches to commands-only mode
 * - Result grouping: PAGES, RECENT RECORDS, COMMANDS sections
 * - No results state shows correct message
 * - Footer hints render
 * - Commands-only mode hides PAGES and RECENT groups
 *
 * Mantine Spotlight uses a modal portal and a global store.
 * We mock @mantine/spotlight to render inline for testability.
 * vi.hoisted() is used so mock functions are available inside the vi.mock factory,
 * which is hoisted to the top of the file by Vitest's transform.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { useCommandPaletteActions } from '../../../hooks/useCommandPaletteActions';
import { clearRegistry, registerPanel } from '../../../panels/registry';
import { RECENT_RECORDS_STORAGE_KEY } from '../../../hooks/useCommandPaletteActions';
import type { RecentRecord } from '../../../hooks/useCommandPaletteActions';

// -----------------------------------------------------------------------
// Declare mock functions with vi.hoisted so they are available inside
// the vi.mock factory (which is hoisted before module-level code).
// -----------------------------------------------------------------------
const { mockOpenSpotlight, mockCloseSpotlight } = vi.hoisted(() => ({
  mockOpenSpotlight: vi.fn(),
  mockCloseSpotlight: vi.fn(),
}));

// -----------------------------------------------------------------------
// Mock @mantine/spotlight to render a simple inline overlay for testing.
// -----------------------------------------------------------------------
vi.mock('@mantine/spotlight', () => {
  // Root passes query and onQueryChange via a context-like object attached to the DOM.
  // We use a simple React context within the mock to avoid mutating outer variables
  // (which ESLint react-hooks/exhaustive-deps forbids inside components).
  const SpotlightCtx = React.createContext<{
    query: string;
    onQueryChange: (v: string) => void;
  }>({ query: '', onQueryChange: () => {} });

  const Root = ({
    children,
    query,
    onQueryChange,
    'data-testid': testId,
  }: {
    children: React.ReactNode;
    query?: string;
    onQueryChange?: (v: string) => void;
    shortcut?: string;
    classNames?: Record<string, string>;
    'data-testid'?: string;
  }) => {
    const ctxValue = React.useMemo(
      () => ({ query: query ?? '', onQueryChange: onQueryChange ?? (() => {}) }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [query, onQueryChange],
    );
    return (
      <SpotlightCtx.Provider value={ctxValue}>
        <div data-testid={testId ?? 'spotlight-root'} role="dialog" aria-label="Command palette">
          {children}
        </div>
      </SpotlightCtx.Provider>
    );
  };

  const Search = ({
    placeholder,
    'aria-label': ariaLabel,
  }: {
    placeholder?: string;
    'aria-label'?: string;
  }) => {
    const ctx = React.useContext(SpotlightCtx);
    return (
      <input
        data-testid="spotlight-search"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={ctx.query}
        onChange={(e) => ctx.onQueryChange(e.target.value)}
      />
    );
  };

  const ActionsList = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="spotlight-actions-list" role="listbox">
      {children}
    </div>
  );

  const ActionsGroup = ({
    label,
    children,
    classNames: _classNames,
  }: {
    label?: string;
    children: React.ReactNode;
    classNames?: Record<string, string>;
  }) => (
    <div data-testid={`spotlight-group-${(label ?? '').toLowerCase().replace(/\s+/g, '-')}`}>
      <div data-testid="group-label">{label}</div>
      {children}
    </div>
  );

  const Action = ({
    children,
    onClick,
    'data-testid': testId,
    className: _className,
    closeSpotlightOnTrigger: _close,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler;
    closeSpotlightOnTrigger?: boolean;
    className?: string;
    'data-testid'?: string;
  }) => (
    <div
      data-testid={testId ?? 'spotlight-action'}
      role="option"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onClick?.(e as unknown as React.MouseEvent);
        }
      }}
      tabIndex={0}
    >
      {children}
    </div>
  );

  const Empty = ({
    children,
    className: _className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="spotlight-empty">{children}</div>;

  const Footer = ({
    children,
    className: _className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="spotlight-footer">{children}</div>;

  const Spotlight = Object.assign(() => null, {
    Root,
    Search,
    ActionsList,
    ActionsGroup,
    Action,
    Empty,
    Footer,
    open: mockOpenSpotlight,
    close: mockCloseSpotlight,
    toggle: vi.fn(),
  });

  return {
    Spotlight,
    openSpotlight: mockOpenSpotlight,
    closeSpotlight: mockCloseSpotlight,
    toggleSpotlight: vi.fn(),
  };
});

// -----------------------------------------------------------------------
// Mock sidebarStore toggle
// -----------------------------------------------------------------------
vi.mock('../../../stores/sidebarStore', () => ({
  useSidebarStore: (
    selector: (state: { collapsed: boolean; toggle: () => void }) => unknown,
  ) => selector({ collapsed: false, toggle: vi.fn() }),
}));

// -----------------------------------------------------------------------
// Import components under test (after mocks are set up)
// -----------------------------------------------------------------------
import { CommandPalette, openCommandPalette } from '../CommandPalette';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

function makeRecentRecord(overrides: Partial<RecentRecord> = {}): RecentRecord {
  return {
    id: 'r1',
    title: 'Invoice #001',
    type: 'Invoice',
    pageId: 'page-1',
    timestamp: Date.now(),
    ...overrides,
  };
}

// -----------------------------------------------------------------------
// Tests: useCommandPaletteActions hook
// -----------------------------------------------------------------------

describe('useCommandPaletteActions', () => {
  beforeEach(() => {
    clearRegistry();
    localStorage.clear();
  });

  afterEach(() => {
    clearRegistry();
    localStorage.clear();
  });

  function TestHookConsumer({ query }: { query: string }) {
    const grouped = useCommandPaletteActions(query);
    return (
      <div>
        <div data-testid="pages-count">{grouped.pages.length}</div>
        <div data-testid="recent-count">{grouped.recent.length}</div>
        <div data-testid="commands-count">{grouped.commands.length}</div>
        <div data-testid="commands-only">{grouped.commandsOnly ? 'true' : 'false'}</div>
        <div data-testid="total">{grouped.total}</div>
        {grouped.pages.map((a) => (
          <div key={a.id} data-testid={`page-${a.id}`}>
            {a.label}
          </div>
        ))}
        {grouped.recent.map((a) => (
          <div key={a.id} data-testid={`recent-${a.id}`}>
            {a.label}
          </div>
        ))}
        {grouped.commands.map((a) => (
          <div key={a.id} data-testid={`cmd-${a.id}`}>
            {a.label}
          </div>
        ))}
      </div>
    );
  }

  it('returns pages from panel registry', () => {
    registerPanel({
      id: 'test-panel',
      title: 'Test Panel',
      component: () => null,
    });
    renderWithProviders(<TestHookConsumer query="" />);
    expect(screen.getByTestId('page-page:test-panel')).toBeInTheDocument();
    expect(screen.getByTestId('pages-count').textContent).toBe('1');
  });

  it('returns static commands', () => {
    renderWithProviders(<TestHookConsumer query="" />);
    const count = parseInt(screen.getByTestId('commands-count').textContent ?? '0');
    expect(count).toBeGreaterThan(0);
  });

  it('returns recent records from localStorage', () => {
    const records: RecentRecord[] = [makeRecentRecord()];
    localStorage.setItem(RECENT_RECORDS_STORAGE_KEY, JSON.stringify(records));
    renderWithProviders(<TestHookConsumer query="" />);
    expect(screen.getByTestId('recent-count').textContent).toBe('1');
    expect(screen.getByTestId('recent-recent:r1').textContent).toBe('Invoice #001');
  });

  it('filters pages by query', () => {
    registerPanel({ id: 'panel-alpha', title: 'Alpha Report', component: () => null });
    registerPanel({ id: 'panel-beta', title: 'Beta Report', component: () => null });
    renderWithProviders(<TestHookConsumer query="alpha" />);
    expect(screen.getByTestId('page-page:panel-alpha')).toBeInTheDocument();
    expect(screen.queryByTestId('page-page:panel-beta')).not.toBeInTheDocument();
  });

  it('filters commands by query', () => {
    renderWithProviders(<TestHookConsumer query="sidebar" />);
    const cmdCount = parseInt(screen.getByTestId('commands-count').textContent ?? '0');
    expect(cmdCount).toBeGreaterThan(0);
    expect(cmdCount).toBeLessThan(5); // Should be fewer than all 5 commands
  });

  it('switches to commands-only mode when query starts with ">"', () => {
    registerPanel({ id: 'panel-x', title: 'X Panel', component: () => null });
    renderWithProviders(<TestHookConsumer query=">sidebar" />);
    expect(screen.getByTestId('commands-only').textContent).toBe('true');
    expect(screen.getByTestId('pages-count').textContent).toBe('0');
    expect(screen.getByTestId('recent-count').textContent).toBe('0');
  });

  it('commands-only mode with empty string after ">" shows all commands', () => {
    renderWithProviders(<TestHookConsumer query=">" />);
    expect(screen.getByTestId('commands-only').textContent).toBe('true');
    const count = parseInt(screen.getByTestId('commands-count').textContent ?? '0');
    expect(count).toBeGreaterThan(0);
  });

  it('returns total of zero when nothing matches query', () => {
    renderWithProviders(<TestHookConsumer query="zzznomatch" />);
    expect(screen.getByTestId('total').textContent).toBe('0');
  });

  it('ignores invalid JSON in localStorage for recent records', () => {
    localStorage.setItem(RECENT_RECORDS_STORAGE_KEY, 'not-json');
    renderWithProviders(<TestHookConsumer query="" />);
    expect(screen.getByTestId('recent-count').textContent).toBe('0');
  });

  it('ignores non-array localStorage value for recent records', () => {
    localStorage.setItem(RECENT_RECORDS_STORAGE_KEY, '{"id":"r1"}');
    renderWithProviders(<TestHookConsumer query="" />);
    expect(screen.getByTestId('recent-count').textContent).toBe('0');
  });

  it('filters recent records by query', () => {
    const records: RecentRecord[] = [
      makeRecentRecord({ id: 'r1', title: 'Invoice #001' }),
      makeRecentRecord({ id: 'r2', title: 'Purchase Order #42', timestamp: Date.now() - 1000 }),
    ];
    localStorage.setItem(RECENT_RECORDS_STORAGE_KEY, JSON.stringify(records));
    renderWithProviders(<TestHookConsumer query="invoice" />);
    expect(screen.getByTestId('recent-recent:r1')).toBeInTheDocument();
    expect(screen.queryByTestId('recent-recent:r2')).not.toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------
// Tests: CommandPalette component rendering
// -----------------------------------------------------------------------

describe('CommandPalette component', () => {
  beforeEach(() => {
    clearRegistry();
    localStorage.clear();
  });

  afterEach(() => {
    clearRegistry();
    localStorage.clear();
  });

  it('renders the spotlight root element', () => {
    renderWithProviders(<CommandPalette />);
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    renderWithProviders(<CommandPalette />);
    expect(screen.getByTestId('spotlight-search')).toBeInTheDocument();
  });

  it('renders search placeholder text', () => {
    renderWithProviders(<CommandPalette />);
    const input = screen.getByTestId('spotlight-search');
    expect(input).toHaveAttribute('placeholder', expect.stringContaining('Search'));
  });

  it('renders aria-label on search input', () => {
    renderWithProviders(<CommandPalette />);
    const input = screen.getByTestId('spotlight-search');
    expect(input).toHaveAttribute('aria-label');
  });

  it('renders footer hints', () => {
    renderWithProviders(<CommandPalette />);
    const footer = screen.getByTestId('spotlight-footer');
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toContain('to navigate');
    expect(footer.textContent).toContain('to open');
    expect(footer.textContent).toContain('to close');
    expect(footer.textContent).toContain('for commands');
  });

  it('shows COMMANDS group with static commands', () => {
    renderWithProviders(<CommandPalette />);
    expect(screen.getByTestId('spotlight-group-commands')).toBeInTheDocument();
    expect(screen.getByText('Toggle sidebar')).toBeInTheDocument();
  });

  it('shows PAGES group when panels are registered', () => {
    registerPanel({ id: 'test-panel', title: 'Test Panel', component: () => null });
    renderWithProviders(<CommandPalette />);
    expect(screen.getByTestId('spotlight-group-pages')).toBeInTheDocument();
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
  });

  it('shows RECENT RECORDS group when localStorage has data', () => {
    const records: RecentRecord[] = [makeRecentRecord()];
    localStorage.setItem(RECENT_RECORDS_STORAGE_KEY, JSON.stringify(records));
    renderWithProviders(<CommandPalette />);
    expect(screen.getByTestId('spotlight-group-recent-records')).toBeInTheDocument();
    expect(screen.getByText('Invoice #001')).toBeInTheDocument();
  });

  it('group labels use uppercase strings from i18n', () => {
    registerPanel({ id: 'p1', title: 'P1', component: () => null });
    renderWithProviders(<CommandPalette />);
    const labels = screen.getAllByTestId('group-label').map((el) => el.textContent);
    expect(labels).toContain('PAGES');
    expect(labels).toContain('COMMANDS');
  });

  it('command items render ">" prefix', () => {
    renderWithProviders(<CommandPalette />);
    const cmdGroup = screen.getByTestId('spotlight-group-commands');
    expect(cmdGroup.textContent).toContain('>');
  });

  it('shows no results empty state when query has no matches', async () => {
    renderWithProviders(<CommandPalette />);
    const input = screen.getByTestId('spotlight-search');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'zzznomatch' } });
      // Wait for debounce
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.getByTestId('spotlight-empty')).toBeInTheDocument();
    expect(screen.getByTestId('spotlight-empty').textContent).toContain('zzznomatch');
  });

  it('shows no results message with the exact search query', async () => {
    renderWithProviders(<CommandPalette />);
    const input = screen.getByTestId('spotlight-search');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'xyznotfound' } });
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.getByTestId('spotlight-empty').textContent).toContain('xyznotfound');
  });

  it('shows commands-only mode hint when ">" prefix is typed', async () => {
    renderWithProviders(<CommandPalette />);
    const input = screen.getByTestId('spotlight-search');
    await act(async () => {
      fireEvent.change(input, { target: { value: '>' } });
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.getByText(/commands mode/i)).toBeInTheDocument();
  });

  it('hides PAGES group in commands-only mode', async () => {
    registerPanel({ id: 'panel-x', title: 'X Panel', component: () => null });
    renderWithProviders(<CommandPalette />);
    const input = screen.getByTestId('spotlight-search');
    await act(async () => {
      fireEvent.change(input, { target: { value: '>toggle' } });
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.queryByTestId('spotlight-group-pages')).not.toBeInTheDocument();
  });

  it('hides RECENT RECORDS group in commands-only mode', async () => {
    const records: RecentRecord[] = [makeRecentRecord()];
    localStorage.setItem(RECENT_RECORDS_STORAGE_KEY, JSON.stringify(records));
    renderWithProviders(<CommandPalette />);
    const input = screen.getByTestId('spotlight-search');
    await act(async () => {
      fireEvent.change(input, { target: { value: '>toggle' } });
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.queryByTestId('spotlight-group-recent-records')).not.toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------
// Tests: openCommandPalette export
// -----------------------------------------------------------------------

describe('openCommandPalette export', () => {
  it('is a callable function', () => {
    expect(typeof openCommandPalette).toBe('function');
  });

  it('delegates to openSpotlight', () => {
    mockOpenSpotlight.mockClear();
    openCommandPalette();
    expect(mockOpenSpotlight).toHaveBeenCalled();
  });
});
