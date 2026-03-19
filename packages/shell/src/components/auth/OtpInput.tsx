'use client';

/**
 * OtpInput — Reusable 6-digit OTP input component.
 *
 * Renders six individual character inputs in a 3-dash-3 pattern.
 * Supports:
 * - Auto-advance to the next field on digit entry
 * - Backspace to return focus to the previous field
 * - Paste of 6 digits (fills all fields and focuses the last)
 *
 * Design: Patterns Library §9 (Forms) — monospace font, consistent field sizing.
 * All colors via --v-* CSS tokens. All strings via t().
 */

import React, { useRef, useCallback } from 'react';
import { Group, Text, Box } from '@mantine/core';
import { t } from '@/lib/i18n';

export interface OtpInputProps {
  /** Current 6-character value (digits only). */
  value: string;
  /** Called whenever the combined value changes. */
  onChange: (value: string) => void;
  /** Whether the input is in a disabled state. */
  disabled?: boolean;
  /** Error message to display below the inputs. */
  error?: string;
  /** aria-label for the overall input group. */
  label?: string;
}

const DIGIT_COUNT = 6;

const inputStyle: React.CSSProperties = {
  width: '2.75rem',
  height: '3rem',
  textAlign: 'center',
  fontSize: 'var(--v-text-xl)',
  fontFamily: 'var(--v-font-mono)',
  fontWeight: 500,
  border: '1px solid var(--v-border-default)',
  borderRadius: '6px',
  backgroundColor: 'var(--v-bg-primary)',
  color: 'var(--v-text-primary)',
  outline: 'none',
  caretColor: 'transparent',
  transition: 'border-color 80ms ease',
};

const inputFocusStyle: React.CSSProperties = {
  borderColor: 'var(--v-border-focus)',
  boxShadow: '0 0 0 2px var(--v-accent-primary-light)',
};

const inputErrorStyle: React.CSSProperties = {
  borderColor: 'var(--v-status-error)',
};

export function OtpInput({ value, onChange, disabled = false, error, label }: OtpInputProps) {
  // Pad or trim the value to exactly DIGIT_COUNT characters for controlled inputs.
  // Space (' ') is used as the internal empty-slot sentinel so positional information is preserved.
  const digits = value.padEnd(DIGIT_COUNT, ' ').slice(0, DIGIT_COUNT).split('').map((ch) => (ch === ' ' ? '' : ch));

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(DIGIT_COUNT).fill(null));
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

  const focusInput = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(DIGIT_COUNT - 1, index));
    inputRefs.current[clamped]?.focus();
  }, []);

  function buildNewValue(index: number, digit: string): string {
    // Pad with space sentinel to preserve positional information across 6 slots.
    const arr = value.padEnd(DIGIT_COUNT, ' ').slice(0, DIGIT_COUNT).split('');
    arr[index] = digit;
    return arr.join('');
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index] !== '' && digits[index] !== undefined) {
        // Clear current field — use space sentinel to preserve positional length.
        onChange(buildNewValue(index, ' '));
      } else if (index > 0) {
        // Move back and clear previous field.
        const newValue = buildNewValue(index - 1, ' ');
        onChange(newValue);
        focusInput(index - 1);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusInput(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusInput(index + 1);
    }
  }

  function handleChange(index: number, event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    // Only accept digit characters.
    const digit = raw.replace(/\D/g, '').slice(-1);

    if (digit === '') return;

    const newValue = buildNewValue(index, digit);
    onChange(newValue);

    // Advance focus to next input.
    if (index < DIGIT_COUNT - 1) {
      focusInput(index + 1);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
    if (pasted.length === 0) return;

    // Fill as many digits as were pasted; remaining slots keep their existing value or space sentinel.
    const current: string[] = value.padEnd(DIGIT_COUNT, ' ').slice(0, DIGIT_COUNT).split('');
    for (let i = 0; i < pasted.length; i++) {
      current[i] = pasted[i];
    }
    onChange(current.join(''));

    // Focus the field after the last pasted digit (or last field).
    focusInput(Math.min(pasted.length, DIGIT_COUNT - 1));
  }

  function handleFocus(index: number) {
    setFocusedIndex(index);
    // Select the digit text so typing immediately replaces it.
    inputRefs.current[index]?.select();
  }

  function handleBlur() {
    setFocusedIndex(null);
  }

  function getInputStyle(index: number): React.CSSProperties {
    let style = { ...inputStyle };
    if (focusedIndex === index) {
      style = { ...style, ...inputFocusStyle };
    }
    if (error) {
      style = { ...style, ...inputErrorStyle };
    }
    if (disabled) {
      style = { ...style, opacity: 0.5, cursor: 'not-allowed' };
    }
    return style;
  }

  return (
    <Box>
      {label && (
        <Text
          fz="var(--v-text-sm)"
          fw={500}
          c="var(--v-text-primary)"
          mb="xs"
          component="label"
        >
          {label}
        </Text>
      )}
      <Group
        gap="xs"
        align="center"
        role="group"
        aria-label={label ?? t('otp.ariaLabel')}
      >
        {/* First group: digits 0-2 */}
        {[0, 1, 2].map((index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[index] ?? ''}
            disabled={disabled}
            aria-label={`${t('otp.digitLabel')} ${index + 1}`}
            style={getInputStyle(index)}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
            autoComplete="one-time-code"
          />
        ))}

        {/* Dash separator */}
        <Text c="var(--v-text-tertiary)" fz="var(--v-text-xl)" fw={400} aria-hidden="true">
          —
        </Text>

        {/* Second group: digits 3-5 */}
        {[3, 4, 5].map((index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[index] ?? ''}
            disabled={disabled}
            aria-label={`${t('otp.digitLabel')} ${index + 1}`}
            style={getInputStyle(index)}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
          />
        ))}
      </Group>

      {error && (
        <Text
          fz="var(--v-text-xs)"
          c="var(--v-status-error)"
          mt="xs"
          role="alert"
          aria-live="polite"
        >
          {error}
        </Text>
      )}
    </Box>
  );
}
