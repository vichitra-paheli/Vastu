'use client';

/**
 * TextFilterInput — multi-value tag input with IER mode for text columns.
 *
 * Include/Exclude: multi-value tag input (type to add, click × to remove)
 * Regex: single text input with inline validation error
 *
 * Implements US-114 (AC-2, AC-3).
 */

import React from 'react';
import { TagsInput, TextInput, Text } from '@mantine/core';
import { FilterModeSelector } from '../FilterModeSelector';
import { t } from '../../../lib/i18n';
import { validateRegex } from '../FilterEngine';
import type { FilterCondition } from '../types';
import classes from './FilterInputs.module.css';

export interface TextFilterInputProps {
  condition: FilterCondition;
  onChange: (updated: FilterCondition) => void;
}

export function TextFilterInput({ condition, onChange }: TextFilterInputProps) {
  const { mode, value } = condition;

  // Regex validation
  const regexError: string | null = React.useMemo(() => {
    if (mode !== 'regex') return null;
    return validateRegex(typeof value === 'string' ? value : '');
  }, [mode, value]);

  function handleModeChange(newMode: FilterCondition['mode']) {
    // Reset value when switching modes
    const newValue = newMode === 'regex' ? '' : [];
    onChange({ ...condition, mode: newMode, value: newValue });
  }

  function handleTagsChange(tags: string[]) {
    onChange({ ...condition, value: tags });
  }

  function handleRegexChange(pattern: string) {
    onChange({ ...condition, value: pattern });
  }

  const tags = Array.isArray(value) ? (value as string[]) : [];
  const regexValue = typeof value === 'string' ? value : '';

  return (
    <div className={classes.inputRow}>
      <FilterModeSelector value={mode} onChange={handleModeChange} />
      <div className={classes.inputControl}>
        {mode === 'regex' ? (
          <>
            <TextInput
              value={regexValue}
              onChange={(e) => handleRegexChange(e.currentTarget.value)}
              placeholder={t('filter.input.regex.placeholder')}
              size="xs"
              error={regexError !== null}
              className={classes.textInput}
            />
            {regexError && (
              <Text size="xs" c="var(--v-status-error)" mt={2}>
                {t('filter.input.regex.error')}
              </Text>
            )}
          </>
        ) : (
          <TagsInput
            value={tags}
            onChange={handleTagsChange}
            placeholder={tags.length === 0 ? t('filter.input.text.placeholder') : ''}
            size="xs"
            className={classes.tagsInput}
            clearable
          />
        )}
      </div>
    </div>
  );
}
