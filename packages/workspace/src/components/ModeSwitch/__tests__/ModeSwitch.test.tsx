/**
 * ModeSwitch unit tests.
 *
 * Covers:
 * - Renders all three mode segments by default
 * - Hides regex segment when disableRegex is true
 * - Falls back to include when disableRegex and value is regex
 * - Active segment has aria-checked="true"
 * - Inactive segments have aria-checked="false"
 * - Clicking a segment calls onChange with the correct mode
 * - Disabled state: clicks do not fire onChange
 * - Disabled state: segments have disabled attribute
 * - Custom aria-label is forwarded to the group
 * - Uses role="radiogroup"
 * - Tooltip shows descriptive text (not just mode name)
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

function getRadioByName(name: string) {
  return screen.getAllByRole('radio').find((el) => el.textContent?.includes(name));
}

describe('ModeSwitch', () => {
  it('renders three segments by default', () => {
    renderSwitch();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('renders only two segments when disableRegex is true', () => {
    renderSwitch('include', vi.fn(), { disableRegex: true });
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('calls onChange with include when disableRegex is true and value is regex', () => {
    const onChange = vi.fn();
    renderSwitch('regex', onChange, { disableRegex: true });
    expect(onChange).toHaveBeenCalledWith('include');
  });

  it('marks the active segment with aria-checked="true"', () => {
    renderSwitch('exclude');
    const excludeBtn = getRadioByName('Exclude');
    expect(excludeBtn?.getAttribute('aria-checked')).toBe('true');
  });

  it('marks inactive segments with aria-checked="false"', () => {
    renderSwitch('include');
    const excludeBtn = getRadioByName('Exclude');
    const regexBtn = getRadioByName('Regex');
    expect(excludeBtn?.getAttribute('aria-checked')).toBe('false');
    expect(regexBtn?.getAttribute('aria-checked')).toBe('false');
  });

  it('calls onChange with "exclude" when Exclude is clicked', () => {
    const onChange = vi.fn();
    renderSwitch('include', onChange);
    fireEvent.click(getRadioByName('Exclude')!);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('exclude');
  });

  it('calls onChange with "regex" when Regex is clicked', () => {
    const onChange = vi.fn();
    renderSwitch('include', onChange);
    fireEvent.click(getRadioByName('Regex')!);
    expect(onChange).toHaveBeenCalledWith('regex');
  });

  it('calls onChange with "include" when Include is clicked', () => {
    const onChange = vi.fn();
    renderSwitch('exclude', onChange);
    fireEvent.click(getRadioByName('Include')!);
    expect(onChange).toHaveBeenCalledWith('include');
  });

  it('does not call onChange when disabled and a segment is clicked', () => {
    const onChange = vi.fn();
    renderSwitch('include', onChange, { disabled: true });
    fireEvent.click(getRadioByName('Exclude')!);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sets disabled attribute on all segments when disabled', () => {
    renderSwitch('include', vi.fn(), { disabled: true });
    const buttons = screen.getAllByRole('radio');
    buttons.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('uses a custom aria-label on the radiogroup', () => {
    renderSwitch('include', vi.fn(), { 'aria-label': 'Custom label' });
    expect(screen.getByRole('radiogroup', { name: 'Custom label' })).toBeTruthy();
  });

  it('renders the container with role="radiogroup"', () => {
    renderSwitch();
    expect(screen.getByRole('radiogroup')).toBeTruthy();
  });

  it('renders segments with role="radio"', () => {
    renderSwitch();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });

  it('renders short labels I, E, R', () => {
    renderSwitch();
    expect(screen.getByText('I')).toBeTruthy();
    expect(screen.getByText('E')).toBeTruthy();
    expect(screen.getByText('R')).toBeTruthy();
  });

  it('renders full mode labels Include, Exclude, Regex', () => {
    renderSwitch();
    expect(screen.getAllByText('Include').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Exclude').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Regex').length).toBeGreaterThan(0);
  });

  it('tooltips show descriptive text not just mode names', () => {
    renderSwitch();
    const includeBtn = getRadioByName('Include');
    expect(includeBtn?.getAttribute('title')).toContain('rows');
  });
});
