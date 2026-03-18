'use client';

/**
 * PasswordStrengthBar — Client-side password strength indicator.
 *
 * Displays a 4-segment bar showing password strength based on the score.
 * Strength logic mirrors `calculatePasswordStrength` from @vastu/shared/utils
 * exactly — inlined here to keep this component testable in Vitest's jsdom
 * environment without requiring Vite to resolve workspace TypeScript packages.
 *
 * Segments:
 *   1 active (score 0-1) → weak   → --v-status-error   (red)
 *   2 active (score 2)   → fair   → --v-accent-tertiary (orange/goldenrod)
 *   3 active (score 3)   → good   → --v-accent-primary  (steel blue)
 *   4 active (score 4-5) → strong → --v-status-success  (green)
 *
 * All colors via --v-* CSS tokens. No hardcoded hex values.
 */

import React from 'react';
import { Group, Text, Box } from '@mantine/core';

interface PasswordStrengthBarProps {
  password: string;
}

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Calculate password strength.
 * Mirrors `calculatePasswordStrength` from @vastu/shared/utils exactly.
 * Score 0-1 → weak, 2 → fair, 3 → good, 4-5 → strong.
 */
function getStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return 'weak';
  if (score <= 2) return 'fair';
  if (score <= 3) return 'good';
  return 'strong';
}

const SEGMENT_COUNT = 4;

const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  weak: 'var(--v-status-error)',
  fair: 'var(--v-accent-tertiary)',
  good: 'var(--v-accent-primary)',
  strong: 'var(--v-status-success)',
};

/**
 * Maps a PasswordStrength value to the number of active segments (1–4).
 */
function activeSegments(strength: PasswordStrength): number {
  switch (strength) {
    case 'weak':
      return 1;
    case 'fair':
      return 2;
    case 'good':
      return 3;
    case 'strong':
      return 4;
  }
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  // When password is empty we show no bar and no label.
  if (!password) {
    return null;
  }

  const strength = getStrength(password);
  const active = activeSegments(strength);
  const color = STRENGTH_COLORS[strength];
  const label = STRENGTH_LABELS[strength];

  return (
    <Box>
      {/* 4-segment bar */}
      <Group gap="var(--v-space-1)" wrap="nowrap" style={{ marginBottom: 'var(--v-space-1)' }}>
        {Array.from({ length: SEGMENT_COUNT }, (_, index) => {
          const isActive = index < active;
          return (
            <Box
              key={index}
              role="presentation"
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: isActive ? color : 'var(--v-border-default)',
                transition: 'background-color 200ms ease',
              }}
            />
          );
        })}
      </Group>

      {/* Strength label */}
      <Text
        fz="var(--v-text-xs)"
        c={color}
        fw={500}
        aria-live="polite"
        aria-label={`Password strength: ${label}`}
      >
        {label}
      </Text>
    </Box>
  );
}
