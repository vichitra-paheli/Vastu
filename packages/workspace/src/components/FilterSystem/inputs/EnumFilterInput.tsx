'use client';

/**
 * EnumFilterInput — checkbox list with search for enum/categorical columns.
 *
 * Supports 100+ values with search filtering.
 * IER mode: Include = checked values shown, Exclude = checked values hidden.
 * Regex: text input matched against value labels.
 *
 * Implements US-114 (AC-2, AC-3).
 */

import React from 'react';
import { TextInput, Checkbox, ScrollArea, Text, Stack, Group } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { FilterModeSelector } from '../FilterModeSelector';
import { t } from '../../../lib/i18n';
import { validateRegex } from '../FilterEngine';
import type { FilterCondition, EnumOption } from '../types';
import classes from './FilterInputs.module.css';

export interface EnumFilterInputProps {
  condition: FilterCondition;
  onChange: (updated: FilterCondition) => void;
  options: EnumOption[];
}

export function EnumFilterInput({ condition, onChange, options }: EnumFilterInputProps) {
  const { mode, value } = condition;
  const [search, setSearch] = React.useState('');

  const selected = Array.isArray(value) ? (value as string[]) : [];
  const regexValue = typeof value === 'string' ? value : '';

  const regexError: string | null = React.useMemo(() => {
    if (mode !== 'regex') return null;
    return validateRegex(regexValue);
  }, [mode, regexValue]);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((opt) =>
      (opt.label ?? opt.value).toLowerCase().includes(lower),
    );
  }, [options, search]);

  function handleModeChange(newMode: FilterCondition['mode']) {
    const newValue = newMode === 'regex' ? '' : [];
    onChange({ ...condition, mode: newMode, value: newValue });
  }

  function handleToggle(optValue: string) {
    const next = selected.includes(optValue)
      ? selected.filter((v) => v !== optValue)
      : [...selected, optValue];
    onChange({ ...condition, value: next });
  }

  function handleRegexChange(pattern: string) {
    onChange({ ...condition, value: pattern });
  }

  return (
    <Stack gap={8}>
      <Group gap={8}>
        <FilterModeSelector value={mode} onChange={handleModeChange} />
      </Group>

      {mode === 'regex' ? (
        <>
          <TextInput
            value={regexValue}
            onChange={(e) => handleRegexChange(e.currentTarget.value)}
            placeholder={t('filter.input.regex.placeholder')}
            size="xs"
            error={regexError !== null}
          />
          {regexError && (
            <Text size="xs" c="var(--v-status-error)">
              {t('filter.input.regex.error')}
            </Text>
          )}
        </>
      ) : (
        <>
          {options.length >= 8 && (
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder={t('filter.input.enum.searchPlaceholder')}
              size="xs"
              leftSection={<IconSearch size={12} />}
              className={classes.searchInput}
            />
          )}

          <ScrollArea h={Math.min(filteredOptions.length * 28 + 8, 200)} type="scroll">
            <Stack gap={2}>
              {filteredOptions.length === 0 ? (
                <Text size="xs" c="var(--v-text-tertiary)" ta="center" py={8}>
                  {search ? t('filter.input.enum.noMatch') : t('filter.input.enum.noOptions')}
                </Text>
              ) : (
                filteredOptions.map((opt) => (
                  <Checkbox
                    key={opt.value}
                    checked={selected.includes(opt.value)}
                    onChange={() => handleToggle(opt.value)}
                    size="xs"
                    label={
                      <Text size="xs" component="span">
                        {opt.label ?? opt.value}
                        {opt.count !== undefined && (
                          <Text span size="xs" c="var(--v-text-tertiary)" ml={4}>
                            ({opt.count})
                          </Text>
                        )}
                      </Text>
                    }
                    className={classes.enumCheckbox}
                  />
                ))
              )}
            </Stack>
          </ScrollArea>
        </>
      )}
    </Stack>
  );
}
