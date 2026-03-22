'use client';

/**
 * SearchOrCreate — search existing records + "Create new" option.
 *
 * Used in form fields that reference related entities (e.g. "Customer", "Project").
 * Shows a text input that filters options and provides a "Create new {label}" button.
 *
 * Accessibility:
 * - role="combobox" on the input
 * - role="listbox" on the dropdown
 * - role="option" on each item
 * - aria-activedescendant on the input pointing to the currently highlighted option
 * - Keyboard: ArrowDown/Up to navigate, Enter to select, Escape to close
 *
 * Implements US-133b SearchOrCreate pattern.
 */

import React, { useState, useRef, useCallback, useId } from 'react';
import { TextInput } from '@mantine/core';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { TruncatedText } from '../../components/TruncatedText';
import classes from './FormPageTemplate.module.css';

export interface SearchOrCreateOption {
  /** Unique identifier for the option. */
  value: string;
  /** Display label shown in the dropdown. */
  label: string;
}

export interface SearchOrCreateProps {
  /** Label shown above the input. */
  label: string;
  /** Whether this field is required. */
  required?: boolean;
  /** Currently selected value (option.value). */
  value?: string;
  /** Placeholder for the search input. */
  placeholder?: string;
  /** Available options to search through. */
  options: SearchOrCreateOption[];
  /** Called when the user selects an existing option. */
  onSelect: (value: string) => void;
  /** Called when the user clicks "Create new". Receives the current search text. */
  onCreateNew: (searchText: string) => void;
  /** Validation error message. */
  error?: string;
  /** Whether the field is disabled. */
  disabled?: boolean;
}

export function SearchOrCreate({
  label,
  required,
  value,
  placeholder,
  options,
  onSelect,
  onCreateNew,
  error,
  disabled,
}: SearchOrCreateProps) {
  const listboxId = useId();
  /** Stable prefix used to generate unique IDs for each option element. */
  const optionIdPrefix = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // The text shown in the input — the label of the selected option, or search text.
  const selectedOption = options.find((o) => o.value === value);
  const [searchText, setSearchText] = useState(selectedOption?.label ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(searchText.toLowerCase()),
  );

  /**
   * Returns the element ID for the currently highlighted option.
   * Returns undefined when nothing is highlighted (highlightIndex === -1).
   * Used for aria-activedescendant on the combobox input.
   */
  function getHighlightedOptionId(): string | undefined {
    if (!isOpen || highlightIndex < 0) return undefined;
    if (highlightIndex < filteredOptions.length) {
      return `${optionIdPrefix}-option-${highlightIndex}`;
    }
    // highlightIndex === filteredOptions.length → "Create new" button
    if (highlightIndex === filteredOptions.length) {
      return `${optionIdPrefix}-create-new`;
    }
    return undefined;
  }

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
      setIsOpen(true);
      setHighlightIndex(-1);
    },
    [],
  );

  const handleSelect = useCallback(
    (option: SearchOrCreateOption) => {
      setSearchText(option.label);
      setIsOpen(false);
      setHighlightIndex(-1);
      onSelect(option.value);
    },
    [onSelect],
  );

  const handleCreateNew = useCallback(() => {
    setIsOpen(false);
    setHighlightIndex(-1);
    onCreateNew(searchText);
  }, [onCreateNew, searchText]);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Close only if focus has left the component entirely.
    if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const totalItems = filteredOptions.length + 1; // +1 for "Create new"
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setIsOpen(true);
          // From -1 (nothing selected), move to first item (0).
          setHighlightIndex((i) => (i < 0 ? 0 : (i + 1) % totalItems));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setIsOpen(true);
          // From -1 (nothing selected), wrap to the last item.
          setHighlightIndex((i) => (i <= 0 ? totalItems - 1 : i - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
            const opt = filteredOptions[highlightIndex];
            if (opt) handleSelect(opt);
          } else if (highlightIndex === filteredOptions.length) {
            handleCreateNew();
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightIndex(-1);
          break;
        default:
          break;
      }
    },
    [filteredOptions, highlightIndex, handleSelect, handleCreateNew],
  );

  const activeDescendantId = getHighlightedOptionId();

  return (
    <div className={classes.searchOrCreate}>
      <TextInput
        ref={inputRef}
        label={
          <span className={classes.fieldLabel}>
            {label}
            {required && (
              <span className={classes.required} aria-hidden="true">
                *
              </span>
            )}
          </span>
        }
        placeholder={placeholder ?? t('form.searchOrCreate.placeholder')}
        value={searchText}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        error={error}
        disabled={disabled}
        leftSection={<IconSearch size={14} aria-hidden="true" />}
        aria-required={required}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendantId}
        role="combobox"
        styles={{
          label: { marginBottom: 'var(--v-space-1)' },
        }}
      />

      {isOpen && (
        <div
          ref={dropdownRef}
          id={listboxId}
          className={classes.searchOrCreateDropdown}
          role="listbox"
          aria-label={t('form.searchOrCreate.listboxAriaLabel', { label })}
        >
          {filteredOptions.length === 0 && (
            <div className={classes.searchOrCreateEmpty}>
              {t('form.searchOrCreate.noResults')}
            </div>
          )}

          {filteredOptions.map((option, index) => (
            <button
              key={option.value}
              id={`${optionIdPrefix}-option-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={classes.searchOrCreateOption}
              style={
                index === highlightIndex
                  ? { backgroundColor: 'var(--v-interactive-hover)' }
                  : undefined
              }
              onMouseDown={(e) => {
                // Prevent blur before click registers.
                e.preventDefault();
                handleSelect(option);
              }}
            >
              <TruncatedText maxWidth={300}>{option.label}</TruncatedText>
            </button>
          ))}

          <button
            id={`${optionIdPrefix}-create-new`}
            type="button"
            role="option"
            aria-selected={false}
            className={`${classes.searchOrCreateOption} ${classes.createNew}`}
            style={
              highlightIndex === filteredOptions.length
                ? { backgroundColor: 'var(--v-interactive-hover)' }
                : undefined
            }
            onMouseDown={(e) => {
              e.preventDefault();
              handleCreateNew();
            }}
          >
            <IconPlus size={14} aria-hidden="true" />
            {t('form.searchOrCreate.createNew', { label })}
          </button>
        </div>
      )}
    </div>
  );
}
