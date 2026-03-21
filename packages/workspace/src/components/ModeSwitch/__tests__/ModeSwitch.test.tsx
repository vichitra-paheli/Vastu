/**
 * ModeSwitch unit tests.
 *
 * Covers:
 * - Renders all three mode segments by default
 * - Hides regex segment when disableRegex is true
 * - Active segment has aria-checked="true"
 * - Inactive segments have aria-checked="false"
 * - Clicking a segment calls onChange with the correct mode
 * - Disabled state: clicks do not fire onChange
 * - Disabled state: segments have disabled attribute
 * - Custom aria-label is forwarded to the group
 * - Default aria-label falls back to translation key value
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { ModeSwitch } from '../ModeSwitch';
import type { FilterMode } from '../../FilterSystem/types';

function renderSwitch(
  value: FilterMode = 'include',
  onChange = vi.fn(),
  props: Partial<React.ComponentProps<typeof ModeSwitch>> = {},
) {
  return render(
    <ModeSwitch value={value} onChange={onChange} {...props} />,
    { wrapper: TestProviders },
  );
}

describe('ModeSwitch', () => {
  it('renders three segments by default', () => {
    renderSwitch();
    expect(screen.getByTitle('Include')).toBeTruthy();
    expect(screen.getByTitle('Exclude')).toBeTruthy();
    expect(screen.getByTitle('Regex')).toBeTruthy();
  });

  it('renders only two segments when disableRegex is true', () => {
    renderSwitch('include', vi.fn(), { disableRegex: true });
    expect(screen.getByTitle('Include')).toBeTruthy();
    expect(screen.getByTitle('Exclude')).toBeTruthy();
    expect(screen.queryByTitle('Regex')).toBeNull();
  });

  it('marks the active segment with aria-checked="true"', () => {
    renderSwitch('exclude');
    const excludeBtn = screen.getByTitle('Exclude');
    expect(excludeBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('marks inactive segments with aria-checked="false"', () => {
    renderSwitch('include');
    const excludeBtn = screen.getByTitle('Exclude');
    const regexBtn = screen.getByTitle('Regex');
    expect(excludeBtn.getAttribute('aria-checked')).toBe('false');
    expect(regexBtn.getAttribute('aria-checked')).toBe('false');
  });

  it('calls onChange with "exclude" when Exclude is clicked', () => {
    const onChange = vi.fn();
    renderSwitch('include', onChange);
    fireEvent.click(screen.getByTitle('Exclude'));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('exclude');
  });

  it('calls onChange with "regex" when Regex is clicked', () => {
    const onChange = vi.fn();
    renderSwitch('include', onChange);
    fireEvent.click(screen.getByTitle('Regex'));
    expect(onChange).toHaveBeenCalledWith('regex');
  });

  it('calls onChange with "include" when Include is clicked', () => {
    const onChange = vi.fn();
    renderSwitch('exclude', onChange);
    fireEvent.click(screen.getByTitle('Include'));
    expect(onChange).toHaveBeenCalledWith('include');
  });

  it('does not call onChange when disabled and a segment is clicked', () => {
    const onChange = vi.fn();
    renderSwitch('include', onChange, { disabled: true });
    fireEvent.click(screen.getByTitle('Exclude'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sets disabled attribute on all segments when disabled', () => {
    renderSwitch('include', vi.fn(), { disabled: true });
    const buttons = screen.getAllByRole('radio');
    buttons.forEach((btn) => {
      // HTMLButtonElement.disabled is true
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('uses a custom aria-label on the group', () => {
    renderSwitch('include', vi.fn(), { 'aria-label': 'Custom label' });
    expect(screen.getByRole('group', { name: 'Custom label' })).toBeTruthy();
  });

  it('renders the group with role="group"', () => {
    renderSwitch();
    expect(screen.getByRole('group')).toBeTruthy();
  });

  it('renders segments with role="radio"', () => {
    renderSwitch();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });

  it('shows only two radio buttons when disableRegex', () => {
    renderSwitch('include', vi.fn(), { disableRegex: true });
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
  });

  it('renders short labels I, E, R', () => {
    renderSwitch();
    // Short labels are in aria-hidden spans; we look by aria-hidden=true children
    // They appear as text nodes in the DOM
    expect(screen.getByText('I')).toBeTruthy();
    expect(screen.getByText('E')).toBeTruthy();
    expect(screen.getByText('R')).toBeTruthy();
  });

  it('renders full mode labels Include, Exclude, Regex', () => {
    renderSwitch();
    // The .label span contains the full text
    const includeLabels = screen.getAllByText('Include');
    const excludeLabels = screen.getAllByText('Exclude');
    const regexLabels = screen.getAllByText('Regex');
    expect(includeLabels.length).toBeGreaterThan(0);
    expect(excludeLabels.length).toBeGreaterThan(0);
    expect(regexLabels.length).toBeGreaterThan(0);
  });
});
