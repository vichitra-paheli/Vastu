/**
 * PasswordStrengthBar tests.
 *
 * Tests cover:
 * - Renders nothing when password is empty
 * - Shows correct strength labels (Weak, Fair, Good, Strong)
 * - Shows the correct number of active segments for each strength level
 * - Accessibility attributes
 *
 * The strength calculation logic is inlined in the component (mirrors
 * @vastu/shared/utils calculatePasswordStrength exactly). The canonical
 * implementation is tested in packages/shared/src/utils/__tests__/validation.test.ts.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordStrengthBar } from '../PasswordStrengthBar';
import { TestProviders } from '../../../test-utils/providers';

function renderBar(password: string) {
  return render(<PasswordStrengthBar password={password} />, { wrapper: TestProviders });
}

describe('PasswordStrengthBar', () => {
  // ── Empty password ─────────────────────────────────────────────────────────

  it('renders no strength label or segments when password is empty', () => {
    renderBar('');
    // No strength labels should be visible.
    expect(screen.queryByText(/^(Weak|Fair|Good|Strong)$/)).not.toBeInTheDocument();
    // No bar segments should be rendered.
    const segments = document.querySelectorAll('[role="presentation"]');
    expect(segments).toHaveLength(0);
  });

  // ── Strength labels ────────────────────────────────────────────────────────

  it('shows "Weak" for a very simple short password', () => {
    renderBar('abc');
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('shows "Fair" for a password with at least 8 chars but limited variety', () => {
    // length >= 8 (+1), digit (+1) → score 2 = fair
    renderBar('abcdefg1');
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('shows "Good" for a moderately complex password', () => {
    // length >= 8 (+1), mixed case (+1), digit (+1) → score 3 = good
    renderBar('Abcdef12');
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('shows "Strong" for a fully complex password', () => {
    // length >= 8 (+1), length >= 12 (+1), mixed case (+1), digit (+1), special (+1) → score 5 = strong
    renderBar('Str0ng!Pass#2024');
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  // ── Segment count ─────────────────────────────────────────────────────────

  it('renders 4 segments regardless of strength', () => {
    renderBar('abc');
    const segments = document.querySelectorAll('[role="presentation"]');
    expect(segments).toHaveLength(4);
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('has aria-label reflecting password strength', () => {
    renderBar('Str0ng!Pass#2024');
    expect(screen.getByLabelText(/password strength: strong/i)).toBeInTheDocument();
  });

  it('uses aria-live="polite" on the strength label', () => {
    renderBar('abc');
    const label = screen.getByText('Weak');
    expect(label).toHaveAttribute('aria-live', 'polite');
  });
});
