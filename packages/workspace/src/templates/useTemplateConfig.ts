'use client';

/**
 * useTemplateConfig — fetches and persists page configuration for a template.
 *
 * Fetches from:  GET /api/workspace/pages/{pageId}/config
 * Saves via:     PUT /api/workspace/pages/{pageId}/config
 *
 * Returns sensible defaults when the API returns 404 (new / unconfigured page).
 *
 * Uses TanStack Query for data fetching — the workspace package already depends
 * on @tanstack/react-query and the TestProviders wrapper sets up QueryClient.
 *
 * Implements VASTU-1B-INFRA.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TemplateConfig, TemplateType } from './types';
import { t } from '../lib/i18n';

/** Default template type used when a page has no saved configuration. */
const DEFAULT_TEMPLATE_TYPE: TemplateType = 'table-listing';

/** Build the query key for a page's config. */
function configQueryKey(pageId: string): [string, string] {
  return ['pageConfig', pageId];
}

/** Build the API path for a given pageId. */
function configApiPath(pageId: string): string {
  return `/api/workspace/pages/${pageId}/config`;
}

/**
 * Build a sensible default TemplateConfig when no config is saved.
 * The templateType is intentionally minimal — templates render their own defaults.
 */
function buildDefaultConfig(templateType: TemplateType = DEFAULT_TEMPLATE_TYPE): TemplateConfig {
  return {
    templateType,
    fields: [],
    sections: [],
    metadata: {},
  };
}

async function fetchConfig(pageId: string): Promise<TemplateConfig> {
  const response = await fetch(configApiPath(pageId));

  if (response.status === 404) {
    // Page exists but has no saved configuration — return a sensible default.
    return buildDefaultConfig();
  }

  if (!response.ok) {
    throw new Error(t('template.config.error'));
  }

  const data = (await response.json()) as { config: TemplateConfig };
  return data.config ?? buildDefaultConfig();
}

async function saveConfig(pageId: string, config: TemplateConfig): Promise<TemplateConfig> {
  const response = await fetch(configApiPath(pageId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });

  if (!response.ok) {
    throw new Error(t('template.config.saveError'));
  }

  const data = (await response.json()) as { config: TemplateConfig };
  return data.config;
}

/** Return type of useTemplateConfig. */
export interface UseTemplateConfigResult {
  /** The resolved TemplateConfig, or null while first loading. */
  config: TemplateConfig | null;
  /** True while the initial fetch is in flight. */
  loading: boolean;
  /** Non-null when the fetch or save failed. */
  error: string | null;
  /**
   * Persist an updated TemplateConfig to the API.
   * Optimistically updates the local cache and reverts on failure.
   */
  updateConfig: (config: TemplateConfig) => Promise<void>;
}

/**
 * Fetch and persist the TemplateConfig for a given page.
 *
 * @param pageId - The page whose configuration is managed.
 */
export function useTemplateConfig(pageId: string): UseTemplateConfigResult {
  const queryClient = useQueryClient();

  const {
    data: config = null,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: configQueryKey(pageId),
    queryFn: () => fetchConfig(pageId),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (updatedConfig: TemplateConfig) => saveConfig(pageId, updatedConfig),
    onMutate: async (updatedConfig) => {
      // Cancel in-flight queries to prevent overwriting the optimistic update.
      await queryClient.cancelQueries({ queryKey: configQueryKey(pageId) });
      const previous = queryClient.getQueryData<TemplateConfig>(configQueryKey(pageId));
      // Optimistically update the cache.
      queryClient.setQueryData(configQueryKey(pageId), updatedConfig);
      return { previous };
    },
    onError: (_err, _variables, context) => {
      // Revert to the snapshot on failure.
      if (context?.previous !== undefined) {
        queryClient.setQueryData(configQueryKey(pageId), context.previous);
      }
    },
    onSettled: () => {
      // Always re-fetch after settle to keep the cache in sync with the server.
      void queryClient.invalidateQueries({ queryKey: configQueryKey(pageId) });
    },
  });

  const error: string | null =
    queryError instanceof Error
      ? queryError.message
      : mutation.error instanceof Error
        ? mutation.error.message
        : null;

  async function updateConfig(updatedConfig: TemplateConfig): Promise<void> {
    await mutation.mutateAsync(updatedConfig);
  }

  return { config, loading, error, updateConfig };
}
