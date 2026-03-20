'use client';

/**
 * AppearanceSettings — Client component for the appearance settings page.
 * US-018: Appearance settings.
 *
 * Controls:
 *   1. Color scheme: SegmentedControl (Light / Dark / System)
 *      — applies immediately via Mantine, persisted on change
 *   2. Accent color: ColorSwatch row (8 presets) + custom hex input
 *      — persisted on change
 *   3. Density: SegmentedControl (Compact / Comfortable / Spacious)
 *      — persisted on change (density token applied via data attribute)
 *
 * Auto-saves on change (debounced 500ms). Shows a subtle "Saved" indicator.
 * No explicit save button — changes are applied optimistically.
 *
 * All strings through t(). All colors via --v-* tokens.
 *
 * MCP tool equivalent: update_appearance_settings({ colorScheme, accentColor, density })
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  ColorSwatch,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { showError } from '@/lib/notifications';
import { t } from '@/lib/i18n';
import { ACCENT_PRESETS } from '@/theme/constants';

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AppearanceSettingsProps {
  /** Initial color scheme loaded from user preferences. */
  initialColorScheme?: 'light' | 'dark' | 'auto';
  /** Initial accent color loaded from user preferences. */
  initialAccentColor?: string;
  /** Initial density loaded from user preferences. */
  initialDensity?: 'compact' | 'comfortable' | 'spacious';
}

// ---------------------------------------------------------------------------
// Saved indicator
// ---------------------------------------------------------------------------

function SavedIndicator({ visible }: { visible: boolean }) {
  return (
    <Group
      gap={4}
      align="center"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease',
        pointerEvents: 'none',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <IconCheck size={14} color="var(--v-status-success)" />
      <Text fz="var(--v-text-xs)" c="var(--v-status-success)">
        {t('appearance.saved')}
      </Text>
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppearanceSettings({
  initialColorScheme = 'auto',
  initialAccentColor = '#4C6EF5',
  initialDensity = 'comfortable',
}: AppearanceSettingsProps) {
  const { setColorScheme } = useColorScheme();

  const [colorScheme, setLocalColorScheme] = useState<'light' | 'dark' | 'auto'>(
    initialColorScheme,
  );
  const [accentColor, setAccentColor] = useState<string>(initialAccentColor);
  const [hexInputValue, setHexInputValue] = useState<string>(initialAccentColor);
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>(initialDensity);
  const [savedVisible, setSavedVisible] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply density to the document root so all components can read it.
  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  // ---------------------------------------------------------------------------
  // Auto-save logic
  // ---------------------------------------------------------------------------

  const save = useCallback(
    async (patch: {
      colorScheme?: 'light' | 'dark' | 'auto';
      accentColor?: string;
      density?: 'compact' | 'comfortable' | 'spacious';
    }) => {
      try {
        const response = await fetch('/api/settings/appearance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          showError(data.error ?? t('error.generic'));
          return;
        }

        // Show "Saved" indicator for 2.5 seconds.
        setSavedVisible(true);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSavedVisible(false), 2500);
      } catch {
        showError(t('error.generic'));
      }
    },
    [],
  );

  function scheduleSave(patch: Parameters<typeof save>[0]) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void save(patch);
    }, 500);
  }

  // Clean up timers on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleColorSchemeChange(value: string) {
    const scheme = value as 'light' | 'dark' | 'auto';
    setLocalColorScheme(scheme);
    setColorScheme(scheme);
    scheduleSave({ colorScheme: scheme });
  }

  function handleAccentColorChange(value: string) {
    setAccentColor(value);
    setHexInputValue(value);
    scheduleSave({ accentColor: value });
  }

  function handleHexInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.currentTarget.value;
    setHexInputValue(raw);
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    if (HEX_COLOR_RE.test(normalized)) {
      setAccentColor(normalized);
      scheduleSave({ accentColor: normalized });
    }
  }

  function handleDensityChange(value: string) {
    const d = value as 'compact' | 'comfortable' | 'spacious';
    setDensity(d);
    scheduleSave({ density: d });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box maw={520}>
      <Stack gap="xl">
        {/* ------------------------------------------------------------------ */}
        {/* Section header + saved indicator                                    */}
        {/* ------------------------------------------------------------------ */}
        <Group justify="space-between" align="center">
          <Text fz="var(--v-text-lg)" fw={500} c="var(--v-text-primary)">
            {t('appearance.title')}
          </Text>
          <SavedIndicator visible={savedVisible} />
        </Group>

        {/* ------------------------------------------------------------------ */}
        {/* Color scheme                                                         */}
        {/* ------------------------------------------------------------------ */}
        <Stack gap="xs">
          <Text fz="var(--v-text-sm)" fw={500} c="var(--v-text-primary)">
            {t('appearance.colorScheme.label')}
          </Text>
          <Text fz="var(--v-text-xs)" c="var(--v-text-secondary)">
            {t('appearance.colorScheme.description')}
          </Text>
          <SegmentedControl
            data-testid="color-scheme-control"
            value={colorScheme}
            onChange={handleColorSchemeChange}
            data={[
              { label: t('appearance.colorScheme.light'), value: 'light' },
              { label: t('appearance.colorScheme.dark'), value: 'dark' },
              { label: t('appearance.colorScheme.system'), value: 'auto' },
            ]}
            styles={{
              root: {
                backgroundColor: 'var(--v-bg-secondary)',
                border: '1px solid var(--v-border-subtle)',
              },
              label: {
                color: 'var(--v-text-secondary)',
                fontWeight: 400,
              },
              indicator: {
                backgroundColor: 'var(--v-bg-primary)',
              },
            }}
          />
        </Stack>

        {/* ------------------------------------------------------------------ */}
        {/* Accent color                                                         */}
        {/* ------------------------------------------------------------------ */}
        <Stack gap="xs">
          <Text fz="var(--v-text-sm)" fw={500} c="var(--v-text-primary)">
            {t('appearance.accentColor.label')}
          </Text>
          <Text fz="var(--v-text-xs)" c="var(--v-text-secondary)">
            {t('appearance.accentColor.description')}
          </Text>
          <Group gap="sm" wrap="wrap" data-testid="accent-color-swatches">
            {ACCENT_PRESETS.map((preset) => {
              const isSelected = accentColor.toLowerCase() === preset.value.toLowerCase();
              return (
                <Tooltip key={preset.value} label={preset.label} withArrow>
                  <UnstyledButton
                    onClick={() => handleAccentColorChange(preset.value)}
                    aria-label={preset.label}
                    aria-pressed={isSelected}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ColorSwatch
                      color={preset.value}
                      size={28}
                      style={{
                        outline: isSelected
                          ? `2px solid ${preset.value}`
                          : '2px solid transparent',
                        outlineOffset: '2px',
                        cursor: 'pointer',
                        borderRadius: 'var(--v-radius-full)',
                      }}
                    >
                      {isSelected && <IconCheck size={14} color="white" />}
                    </ColorSwatch>
                  </UnstyledButton>
                </Tooltip>
              );
            })}
          </Group>
          <TextInput
            wrapperProps={{ 'data-testid': 'accent-color-hex-input' }}
            label={t('appearance.accentColor.customLabel')}
            placeholder="#4C6EF5"
            value={hexInputValue}
            onChange={handleHexInputChange}
            maxLength={7}
            styles={{
              label: { color: 'var(--v-text-secondary)', fontWeight: 400 },
              input: {
                fontFamily: 'var(--v-font-mono)',
                color: 'var(--v-text-primary)',
                borderColor: 'var(--v-border-default)',
                width: 140,
              },
            }}
          />
        </Stack>

        {/* ------------------------------------------------------------------ */}
        {/* Density                                                              */}
        {/* ------------------------------------------------------------------ */}
        <Stack gap="xs">
          <Text fz="var(--v-text-sm)" fw={500} c="var(--v-text-primary)">
            {t('appearance.density.label')}
          </Text>
          <Text fz="var(--v-text-xs)" c="var(--v-text-secondary)">
            {t('appearance.density.description')}
          </Text>
          <SegmentedControl
            data-testid="density-control"
            value={density}
            onChange={handleDensityChange}
            data={[
              { label: t('appearance.density.compact'), value: 'compact' },
              { label: t('appearance.density.comfortable'), value: 'comfortable' },
              { label: t('appearance.density.spacious'), value: 'spacious' },
            ]}
            styles={{
              root: {
                backgroundColor: 'var(--v-bg-secondary)',
                border: '1px solid var(--v-border-subtle)',
              },
              label: {
                color: 'var(--v-text-secondary)',
                fontWeight: 400,
              },
              indicator: {
                backgroundColor: 'var(--v-bg-primary)',
              },
            }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
