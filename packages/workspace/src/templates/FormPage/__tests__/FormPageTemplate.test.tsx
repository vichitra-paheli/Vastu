/**
 * Tests for FormPageTemplate, FormWizard, SearchOrCreate, and useFormDraft.
 *
 * Test scenarios:
 * 1. Loading state renders TemplateSkeleton
 * 2. Single-page form renders configured fields
 * 3. Required field validation shows error on submit
 * 4. Submit calls API endpoint
 * 5. Empty config shows empty state message
 * 6. FormWizard renders step count
 * 7. FormWizard blocks Next when required field is empty
 * 8. FormWizard advances when required field is filled
 * 9. FormWizard Back navigates to previous step
 * 10. FormWizard calls onSubmit on last step
 * 11. useFormDraft returns initial values
 * 12. useFormDraft restores draft from localStorage
 * 13. useFormDraft isDirty reflects unsaved changes
 * 14. useFormDraft clearDraft removes draft from localStorage
 * 15. useFormDraft markClean resets dirty state
 * 16. SearchOrCreate renders options on focus
 * 17. SearchOrCreate calls onSelect on option click
 * 18. SearchOrCreate calls onCreateNew on create button click
 * 19. SearchOrCreate filters options by search text
 *
 * Implements US-133d.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormPageTemplate } from '../FormPageTemplate';
import { FormWizard } from '../FormWizard';
import { SearchOrCreate } from '../SearchOrCreate';
import { useFormDraft } from '../useFormDraft';
import type { TemplateConfig } from '../../types';
import type { WizardStep } from '../FormWizard';

// ── Test setup: fix matchMedia mock for Mantine's useReducedMotion ────────────
//
// The global `window.matchMedia` mock from setup.ts returns `addEventListener: vi.fn()`
// which doesn't propagate events. Mantine's Transition/Button accesses `event.matches`
// inside the listener. We patch `matchMedia` here to return a proper mock list that
// handles addEventlistener without crashing.

function patchMatchMedia() {
  const mockMediaQueryList = {
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn(() => mockMediaQueryList),
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function TestProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{children}</MantineProvider>
    </QueryClientProvider>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

function renderMantine(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <MantineProvider>{children}</MantineProvider>,
  });
}

/** Build a mock TemplateConfig for a single-page form. */
function makeSinglePageConfig(fields: TemplateConfig['fields'] = []): TemplateConfig {
  return {
    templateType: 'form-page',
    fields,
    sections: [],
    metadata: { mode: 'single' },
  };
}

// Text and boolean only — avoids NumberInput which uses useMediaQuery via Transition.
const SAMPLE_FIELDS: TemplateConfig['fields'] = [
  { key: 'name', label: 'Name', type: 'text', visible: true },
  { key: 'description', label: 'Description', type: 'text', visible: true },
  { key: 'active', label: 'Active', type: 'boolean', visible: true },
];

// Required field for validation tests
const REQUIRED_FIELD = {
  key: 'email',
  label: 'Email',
  type: 'text' as const,
  visible: true,
  // FormFieldConfig extension
  required: true,
};

// ── FormPageTemplate — single-page mode ───────────────────────────────────────

describe('FormPageTemplate — single-page mode', () => {
  beforeEach(() => {
    patchMatchMedia();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading skeleton while config is loading', async () => {
    vi.mocked(fetch).mockImplementation(
      () => new Promise(() => { /* never resolves */ }),
    );

    renderWithProviders(<FormPageTemplate pageId="page-loading" />);

    const status = document.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('aria-busy')).toBe('true');
  });

  it('renders configured text fields after config loads', async () => {
    const config = makeSinglePageConfig(SAMPLE_FIELDS);
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ config }), { status: 200 }),
    );

    renderWithProviders(<FormPageTemplate pageId="page-fields" />);

    await waitFor(() => {
      expect(document.querySelector('[role="status"]')).toBeNull();
    });

    // Labels should appear after loading
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Description')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('shows empty state when config has no fields', async () => {
    const config = makeSinglePageConfig([]);
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ config }), { status: 200 }),
    );

    renderWithProviders(<FormPageTemplate pageId="page-empty" />);

    await waitFor(() => {
      expect(document.querySelector('[role="status"]')).toBeNull();
    });

    // Should not render any form inputs when there are no fields.
    // The empty state is rendered — no textbox or checkbox should be present.
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    // Should not have a submit button when empty (no footer rendered for empty state).
    expect(screen.queryByRole('button', { name: /submit/i })).toBeNull();
  });

  it('shows required field error on submit when field is empty', async () => {
    const config = makeSinglePageConfig([REQUIRED_FIELD]);
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ config }), { status: 200 }),
    );

    renderWithProviders(<FormPageTemplate pageId="page-required" />);

    await waitFor(() => {
      expect(document.querySelector('[role="status"]')).toBeNull();
    });

    // Find submit button by form attribute — it's the button with type="submit"
    // Use getAllByRole since there may be both Cancel and Submit buttons
    const buttons = screen.getAllByRole('button');
    // The submit button is the last button in the footer
    const submitBtn = buttons[buttons.length - 1];
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // The field error is shown via aria-invalid + error prop on the input wrapper.
      // Check for the invalid input attribute rather than text content.
      const invalidInput = document.querySelector('[aria-invalid="true"]');
      expect(invalidInput).not.toBeNull();
    });
  });

  it('calls POST API on submit when form is valid', async () => {
    const config = makeSinglePageConfig(SAMPLE_FIELDS);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ config }), { status: 200 }),
    );
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'rec-1' }), { status: 200 }),
    );

    renderWithProviders(<FormPageTemplate pageId="page-submit" />);

    await waitFor(() => {
      expect(document.querySelector('[role="status"]')).toBeNull();
    });

    // Fill the name field
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Alice' } });

    // Submit the form — none of the fields are required so it should submit.
    // Use last button since the submit button is the last in the footer.
    const buttons = screen.getAllByRole('button');
    const submitBtn = buttons[buttons.length - 1];
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const postCall = calls.find(
        ([, init]) => (init as RequestInit)?.method === 'POST',
      );
      expect(postCall).toBeDefined();
    });
  });
});

// ── FormWizard tests ──────────────────────────────────────────────────────────

describe('FormWizard', () => {
  const step1Fields = [
    { key: 'name', label: 'Name', type: 'text' as const, visible: true, required: true },
  ];
  const step2Fields = [
    { key: 'email', label: 'Email', type: 'text' as const, visible: true },
  ];

  const wizardSteps: WizardStep[] = [
    { id: 'step-1', label: 'Basic Info', fields: step1Fields },
    { id: 'step-2', label: 'Contact', fields: step2Fields },
  ];

  /** Build a test validate function that checks required fields. */
  function makeOnValidate(values: Record<string, unknown>) {
    return (keys: string[]): Record<string, string> => {
      const errors: Record<string, string> = {};
      const allFields = wizardSteps.flatMap((s) => s.fields);
      for (const key of keys) {
        const field = allFields.find((f) => f.key === key) as
          | (typeof step1Fields[0])
          | undefined;
        if (field?.required && !values[key]) {
          errors[key] = `${field.label} is required`;
        }
      }
      return errors;
    };
  }

  function makeDraft(values: Record<string, unknown>) {
    return {
      values,
      setFieldValue: vi.fn(),
      setValues: vi.fn(),
      isDirty: false,
      draftRestored: false,
      clearDraft: vi.fn(),
      markClean: vi.fn(),
    };
  }

  beforeEach(() => {
    patchMatchMedia();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders step 1 initially with step indicator and step label', () => {
    const draftValues: Record<string, unknown> = { name: '', email: '' };
    const { unmount } = renderMantine(
      <FormWizard
        steps={wizardSteps}
        draft={makeDraft(draftValues)}
        errors={{}}
        onValidate={makeOnValidate(draftValues)}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
      />,
    );

    // Step labels always come from the WizardStep config (not i18n)
    expect(screen.getByText('Basic Info')).toBeTruthy();
    expect(screen.getByText('Contact')).toBeTruthy();
    // Name field should be visible (step 1)
    expect(screen.getByText('Name')).toBeTruthy();
    // Buttons should be present (at least 2 in the footer)
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
    unmount();
  });

  it('blocks Next when required field is empty', async () => {
    const draftValues: Record<string, unknown> = { name: '', email: '' };
    const { unmount } = renderMantine(
      <FormWizard
        steps={wizardSteps}
        draft={makeDraft(draftValues)}
        errors={{}}
        onValidate={makeOnValidate(draftValues)}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
      />,
    );

    // Click the last (rightmost) button — that's the Next/Submit button
    const buttons = screen.getAllByRole('button');
    const nextBtn = buttons[buttons.length - 1];
    fireEvent.click(nextBtn);

    await waitFor(() => {
      // An error message should be shown.
      // When i18n keys are present: "Name is required"
      // When missing: validation error text still shows
      const errorEl = document.querySelector('[class*="Error"], [class*="error"], .mantine-InputWrapper-error');
      // At minimum, an input with aria-invalid should be present
      const invalidInput = document.querySelector('[aria-invalid="true"]');
      expect(invalidInput ?? errorEl).not.toBeNull();
    });
    // Still on step 1 — Name field is still visible
    expect(screen.getByText('Name')).toBeTruthy();
    unmount();
  });

  it('advances to step 2 when required field is filled', async () => {
    const draftValues: Record<string, unknown> = { name: 'Alice', email: '' };
    const { unmount } = renderMantine(
      <FormWizard
        steps={wizardSteps}
        draft={makeDraft(draftValues)}
        errors={{}}
        onValidate={makeOnValidate(draftValues)}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
      />,
    );

    // Click the last (rightmost) button — Next on step 1
    const buttons = screen.getAllByRole('button');
    const nextBtn = buttons[buttons.length - 1];
    fireEvent.click(nextBtn);

    await waitFor(() => {
      // On step 2, Email field should appear
      expect(screen.getByText('Email')).toBeTruthy();
    });
    unmount();
  });

  it('Back button returns to step 1 from step 2', async () => {
    const draftValues: Record<string, unknown> = { name: 'Alice', email: '' };
    const { unmount } = renderMantine(
      <FormWizard
        steps={wizardSteps}
        draft={makeDraft(draftValues)}
        errors={{}}
        onValidate={makeOnValidate(draftValues)}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
        initialStep={1}
      />,
    );

    // On step 2 — Email field visible
    expect(screen.getByText('Email')).toBeTruthy();

    // Click the first (leftmost) button — that's the Back button on step 2
    const buttons = screen.getAllByRole('button');
    const backBtn = buttons[0];
    fireEvent.click(backBtn);

    await waitFor(() => {
      // After going back — Name field visible
      expect(screen.getByText('Name')).toBeTruthy();
    });
    unmount();
  });

  it('calls onSubmit on last step final button click', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const draftValues: Record<string, unknown> = { name: 'Alice', email: '' };
    const { unmount } = renderMantine(
      <FormWizard
        steps={wizardSteps}
        draft={makeDraft(draftValues)}
        errors={{}}
        onValidate={makeOnValidate(draftValues)}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        initialStep={1}
      />,
    );

    // Click the last (rightmost) button — Submit on last step
    const buttons = screen.getAllByRole('button');
    const submitBtn = buttons[buttons.length - 1];
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    unmount();
  });
});

// ── useFormDraft tests ────────────────────────────────────────────────────────

describe('useFormDraft', () => {
  const formId = 'test-form-draft-unit';

  beforeEach(() => {
    // Clear the underlying localStorage mock store
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('returns initial values when no draft exists', () => {
    const initial = { name: '', age: '' };
    const { result } = renderHook(() => useFormDraft(formId, initial));
    expect(result.current.values).toEqual(initial);
    expect(result.current.draftRestored).toBe(false);
  });

  it('restores draft from localStorage on mount', () => {
    const initial = { name: '', age: '' };
    const saved = { name: 'Alice', age: '30' };
    const key = `vastu:form-draft:${formId}`;
    const raw = JSON.stringify({ values: saved, savedAt: new Date().toISOString() });
    // Use the real localStorage API (setup.ts mock delegates to a store)
    localStorage.setItem(key, raw);

    const { result } = renderHook(() => useFormDraft(formId, initial));
    // draftRestored depends on whether localStorage returns the value
    // The setup mock stores values and getItem returns them.
    expect(result.current.values).toEqual(saved);
    expect(result.current.draftRestored).toBe(true);
  });

  it('isDirty is false on initial render', () => {
    const { result } = renderHook(() => useFormDraft(formId, { name: '' }));
    expect(result.current.isDirty).toBe(false);
  });

  it('isDirty becomes true after setFieldValue changes a value', () => {
    const { result } = renderHook(() => useFormDraft(formId, { name: '' }));
    act(() => {
      result.current.setFieldValue('name', 'Bob');
    });
    expect(result.current.isDirty).toBe(true);
  });

  it('isDirty becomes false after markClean', () => {
    const { result } = renderHook(() => useFormDraft(formId, { name: '' }));
    act(() => {
      result.current.setFieldValue('name', 'Bob');
    });
    expect(result.current.isDirty).toBe(true);
    act(() => {
      result.current.markClean();
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('clearDraft removes stored draft from localStorage', () => {
    const initial = { name: '' };
    const key = `vastu:form-draft:${formId}`;
    localStorage.setItem(key, JSON.stringify({ values: { name: 'Alice' }, savedAt: '' }));

    const { result } = renderHook(() => useFormDraft(formId, initial));
    act(() => {
      result.current.clearDraft();
    });
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('setValues replaces all form values', () => {
    const { result } = renderHook(() =>
      useFormDraft(formId, { name: '', email: '' }),
    );
    act(() => {
      result.current.setValues({ name: 'Carol', email: 'carol@example.com' });
    });
    expect(result.current.values).toEqual({ name: 'Carol', email: 'carol@example.com' });
    expect(result.current.isDirty).toBe(true);
  });
});

// ── SearchOrCreate tests ──────────────────────────────────────────────────────

describe('SearchOrCreate', () => {
  const OPTIONS = [
    { value: 'c-1', label: 'Acme Corp' },
    { value: 'c-2', label: 'Beta Ltd' },
    { value: 'c-3', label: 'Gamma Inc' },
  ];

  it('renders a combobox input', () => {
    renderMantine(
      <SearchOrCreate
        label="Customer"
        options={OPTIONS}
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox')).toBeTruthy();
  });

  it('shows options dropdown when input is focused', async () => {
    renderMantine(
      <SearchOrCreate
        label="Customer"
        options={OPTIONS}
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeTruthy();
    });

    expect(screen.getByText('Acme Corp')).toBeTruthy();
    expect(screen.getByText('Beta Ltd')).toBeTruthy();
  });

  it('calls onSelect when an option is clicked', async () => {
    const onSelect = vi.fn();
    renderMantine(
      <SearchOrCreate
        label="Customer"
        options={OPTIONS}
        onSelect={onSelect}
        onCreateNew={vi.fn()}
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeTruthy();
    });

    const optionBtn = screen.getByText('Acme Corp').closest('button');
    expect(optionBtn).not.toBeNull();
    fireEvent.mouseDown(optionBtn!);

    expect(onSelect).toHaveBeenCalledWith('c-1');
  });

  it('calls onCreateNew when Create new button is clicked', async () => {
    const onCreateNew = vi.fn();
    renderMantine(
      <SearchOrCreate
        label="Customer"
        options={OPTIONS}
        onSelect={vi.fn()}
        onCreateNew={onCreateNew}
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'NewCo' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeTruthy();
    });

    // The "create new" button is the last option in the listbox.
    // Use role="option" — the create button is the last one.
    const allOptions = screen.getAllByRole('option');
    const createBtn = allOptions[allOptions.length - 1];
    expect(createBtn).toBeTruthy();
    fireEvent.mouseDown(createBtn);

    expect(onCreateNew).toHaveBeenCalledWith('NewCo');
  });

  it('filters options based on search text', async () => {
    renderMantine(
      <SearchOrCreate
        label="Customer"
        options={OPTIONS}
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Acme' } });

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeTruthy();
    });
    // Beta Ltd should be filtered out
    expect(screen.queryByText('Beta Ltd')).toBeNull();
  });
});
