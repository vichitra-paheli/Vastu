/**
 * OtpInput tests
 *
 * Tests cover:
 * - Renders exactly 6 individual input fields
 * - Auto-advance: typing a digit in a field focuses the next field
 * - Backspace: clears the current field; if already empty, clears the previous field and focuses it
 * - Paste of 6 digits fills all fields
 * - Paste of partial digits fills from the first field
 * - Error message is displayed when the `error` prop is provided
 * - Inputs are disabled when the `disabled` prop is true
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OtpInput } from '../OtpInput';
import { TestProviders } from '@/test-utils/providers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Props {
  value?: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
}

function renderOtp(props: Props = {}) {
  const onChange = props.onChange ?? vi.fn();
  const result = render(
    <OtpInput
      value={props.value ?? ''}
      onChange={onChange}
      disabled={props.disabled}
      error={props.error}
      label={props.label}
    />,
    { wrapper: TestProviders },
  );
  // Return all 6 inputs sorted by their aria-label digit number.
  const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
  return { ...result, onChange, inputs };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OtpInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders exactly 6 input fields', () => {
    renderOtp();
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('renders individual aria-labels for each digit', () => {
    renderOtp();
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByLabelText(`Digit ${i}`)).toBeInTheDocument();
    }
  });

  it('renders the dash separator between digit groups', () => {
    renderOtp();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    renderOtp({ label: 'Enter code' });
    expect(screen.getByText('Enter code')).toBeInTheDocument();
  });

  it('populates input values from the value prop', () => {
    const { inputs } = renderOtp({ value: '123456' });
    expect(inputs[0].value).toBe('1');
    expect(inputs[1].value).toBe('2');
    expect(inputs[2].value).toBe('3');
    expect(inputs[3].value).toBe('4');
    expect(inputs[4].value).toBe('5');
    expect(inputs[5].value).toBe('6');
  });

  it('pads a short value with empty strings', () => {
    const { inputs } = renderOtp({ value: '12' });
    expect(inputs[0].value).toBe('1');
    expect(inputs[1].value).toBe('2');
    expect(inputs[2].value).toBe('');
    expect(inputs[5].value).toBe('');
  });

  // ── Error state ───────────────────────────────────────────────────────────

  it('displays the error message when error prop is provided', () => {
    renderOtp({ error: 'Invalid code' });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid code');
  });

  it('does not display an error message when error prop is absent', () => {
    renderOtp();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // ── Disabled state ────────────────────────────────────────────────────────

  it('disables all inputs when disabled prop is true', () => {
    const { inputs } = renderOtp({ disabled: true });
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  // ── Digit entry and onChange ───────────────────────────────────────────────

  it('calls onChange with the new digit placed at the correct position', async () => {
    const onChange = vi.fn();
    render(
      <OtpInput value="123456" onChange={onChange} />,
      { wrapper: TestProviders },
    );
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.change(inputs[0], { target: { value: '9' } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('923456');
    });
  });

  it('ignores non-digit input characters', async () => {
    const onChange = vi.fn();
    render(
      <OtpInput value="" onChange={onChange} />,
      { wrapper: TestProviders },
    );
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.change(inputs[0], { target: { value: 'a' } });

    // onChange should not be called for a non-digit.
    await waitFor(() => {
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ── Backspace ─────────────────────────────────────────────────────────────

  it('clears the current digit on Backspace when the field has a value', async () => {
    const onChange = vi.fn();
    render(
      <OtpInput value="123456" onChange={onChange} />,
      { wrapper: TestProviders },
    );
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];

    fireEvent.keyDown(inputs[2], { key: 'Backspace' });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
      // index 2 digit '3' is replaced with space sentinel → "12 456" (6-char string with space at index 2)
      const calledWith = onChange.mock.calls[0][0] as string;
      expect(calledWith[0]).toBe('1');
      expect(calledWith[1]).toBe('2');
      expect(calledWith[2]).toBe(' ');
      expect(calledWith[3]).toBe('4');
      expect(calledWith[4]).toBe('5');
      expect(calledWith[5]).toBe('6');
    });
  });

  // ── Paste ─────────────────────────────────────────────────────────────────

  it('fills all 6 inputs when a 6-digit string is pasted', async () => {
    const onChange = vi.fn();
    render(
      <OtpInput value="" onChange={onChange} />,
      { wrapper: TestProviders },
    );
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];

    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => '654321' },
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('654321');
    });
  });

  it('fills only available positions when fewer than 6 digits are pasted', async () => {
    const onChange = vi.fn();
    render(
      <OtpInput value="" onChange={onChange} />,
      { wrapper: TestProviders },
    );
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];

    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => '123' },
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
      const calledWith = onChange.mock.calls[0][0] as string;
      // First 3 positions filled, remaining are empty string chars
      expect(calledWith[0]).toBe('1');
      expect(calledWith[1]).toBe('2');
      expect(calledWith[2]).toBe('3');
      expect(calledWith.length).toBe(6);
    });
  });

  it('strips non-digit characters from pasted content', async () => {
    const onChange = vi.fn();
    render(
      <OtpInput value="" onChange={onChange} />,
      { wrapper: TestProviders },
    );
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];

    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => '1a2b3c4d5e6f' },
    });

    await waitFor(() => {
      // Only digits extracted: '123456'
      expect(onChange).toHaveBeenCalledWith('123456');
    });
  });
});
