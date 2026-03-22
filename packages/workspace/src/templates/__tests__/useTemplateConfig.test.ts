/**
 * Unit tests for useTemplateConfig hook.
 *
 * Tests cover:
 * - Returns config when the API succeeds
 * - Returns null + loading=true while fetching
 * - Returns error string when the API fails
 * - Falls back to default config on 404
 * - updateConfig calls PUT and updates the cache
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTemplateConfig } from '../useTemplateConfig';
import type { TemplateConfig } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockConfig: TemplateConfig = {
  templateType: 'table-listing',
  fields: [{ key: 'name', label: 'Name', type: 'text', visible: true }],
  sections: [],
  metadata: {},
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTemplateConfig', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the config from the API on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ config: mockConfig }), { status: 200 }),
    );

    const queryClient = makeQueryClient();
    const { result } = renderHook(() => useTemplateConfig('page-1'), {
      wrapper: wrapper(queryClient),
    });

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.config).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.config).toEqual(mockConfig);
    expect(result.current.error).toBeNull();
  });

  it('returns a default config when the API responds with 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not found', defaultConfig: { templateType: 'table-listing' } }), {
        status: 404,
      }),
    );

    const queryClient = makeQueryClient();
    const { result } = renderHook(() => useTemplateConfig('page-new'), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.config).not.toBeNull();
    expect(result.current.config?.templateType).toBe('table-listing');
    expect(result.current.error).toBeNull();
  });

  it('returns an error string when the API fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    const queryClient = makeQueryClient();
    const { result } = renderHook(() => useTemplateConfig('page-err'), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.config).toBeNull();
    expect(result.current.error).toBeTypeOf('string');
    expect(result.current.error).not.toBe('');
  });

  it('updateConfig calls PUT with the updated config', async () => {
    // Initial GET
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ config: mockConfig }), { status: 200 }),
    );

    const updatedConfig: TemplateConfig = {
      ...mockConfig,
      templateType: 'dashboard',
    };

    // PUT response
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ config: updatedConfig }), { status: 200 }),
    );

    // Invalidation re-fetch
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ config: updatedConfig }), { status: 200 }),
    );

    const queryClient = makeQueryClient();
    const { result } = renderHook(() => useTemplateConfig('page-update'), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.updateConfig(updatedConfig);

    // Verify the PUT was called
    const calls = vi.mocked(fetch).mock.calls;
    const putCall = calls.find(
      ([, init]) => (init as RequestInit)?.method === 'PUT',
    );
    expect(putCall).toBeDefined();
    const putBody = JSON.parse((putCall?.[1] as RequestInit)?.body as string) as { config: TemplateConfig };
    expect(putBody.config.templateType).toBe('dashboard');
  });

  it('provides an updateConfig function that is a function', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ config: mockConfig }), { status: 200 }),
    );

    const queryClient = makeQueryClient();
    const { result } = renderHook(() => useTemplateConfig('page-fn'), {
      wrapper: wrapper(queryClient),
    });

    expect(typeof result.current.updateConfig).toBe('function');
  });
});
