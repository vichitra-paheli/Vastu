'use client';

/**
 * ErrorPage — Self-contained error layout used by 404 and 500 pages.
 *
 * Design constraints:
 * - No sidebar, no shell layout — works even if the root layout fails.
 * - Uses inline styles for critical layout so it works even if CSS fails to load.
 * - CSS custom properties (--v-*) are used for colors where possible; inline style
 *   fallbacks are included for the critical container so the page is never blank.
 * - KundliMotif displayed as a subtle background element at opacity 0.05.
 * - Mantine components used for the interactive elements only.
 */

import { Anchor, Button, Group, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { KundliMotif } from '../auth/KundliMotif';
import { t } from '@/lib/i18n';

export interface ErrorPageAction {
  /** Button or link label. */
  label: string;
  /** If provided, renders as a link (`<a>`). If omitted, `onClick` must be provided. */
  href?: string;
  /** Click handler. Used when `href` is not provided (e.g. "Try again" on 500 page). */
  onClick?: () => void;
}

export interface ErrorPageProps {
  /** HTTP status code displayed beneath the logo (e.g. 404, 500). */
  statusCode: number;
  /** Short title, e.g. "Page not found". */
  title: string;
  /** Longer explanation shown below the title. */
  message: string;
  /** Array of actions rendered as buttons below the message. */
  actions: readonly ErrorPageAction[];
}

/**
 * VastuWordmark — Inline SVG wordmark so the page works even when assets fail.
 * Uses CSS custom properties with inline-style fallbacks.
 */
function VastuWordmark() {
  return (
    <svg
      width="96"
      height="32"
      viewBox="0 0 96 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={t('error.wordmarkLabel')}
      role="img"
    >
      <text
        x="0"
        y="24"
        fontFamily="var(--v-font-sans, 'Inter', sans-serif)"
        fontSize="24"
        fontWeight="500"
        fill="var(--v-accent-primary, #2378cb)"
        letterSpacing="-0.5"
      >
        {t('error.wordmarkLabel')}
      </text>
    </svg>
  );
}

export function ErrorPage({ statusCode, title, message, actions }: ErrorPageProps) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--v-bg-primary, #ffffff)',
        overflow: 'hidden',
      }}
    >
      {/* KundliMotif — subtle background decoration at opacity 0.05 */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <KundliMotif
          className="error-page-motif"
          style={{
            width: 'min(600px, 90vw)',
            height: 'min(600px, 90vw)',
            opacity: 0.05,
          }}
        />
      </div>

      {/* Content */}
      <Stack
        align="center"
        gap="lg"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '48px 24px',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <VastuWordmark />

        {/* Status code */}
        <Text
          style={{
            fontFamily: 'var(--v-font-mono, monospace)',
            fontSize: 'var(--v-text-sm, 12px)',
            fontWeight: 'var(--v-font-medium, 500)',
            color: 'var(--v-text-tertiary, #999999)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {statusCode}
        </Text>

        {/* Title */}
        <Title
          order={1}
          style={{
            fontSize: 'var(--v-text-2xl, 24px)',
            fontWeight: 'var(--v-font-medium, 500)',
            color: 'var(--v-text-primary, #1a1a1a)',
            lineHeight: 1.2,
          }}
        >
          {title}
        </Title>

        {/* Message */}
        <Text
          style={{
            fontSize: 'var(--v-text-md, 14px)',
            color: 'var(--v-text-secondary, #666666)',
            lineHeight: 1.6,
          }}
        >
          {message}
        </Text>

        {/* Actions */}
        {actions.length > 0 && (
          <Group justify="center" gap="sm" mt="xs">
            {actions.map((action, index) => {
              if (action.href !== undefined) {
                const isPrimary = index === 0;
                return (
                  <Button
                    key={action.label}
                    component={Link}
                    href={action.href}
                    variant={isPrimary ? 'filled' : 'subtle'}
                    size="sm"
                  >
                    {action.label}
                  </Button>
                );
              }

              return (
                <Button
                  key={action.label}
                  onClick={action.onClick}
                  variant={index === 0 ? 'filled' : 'subtle'}
                  size="sm"
                >
                  {action.label}
                </Button>
              );
            })}
          </Group>
        )}

        {/* Footer link back to home — lightweight fallback if actions are absent */}
        <Anchor
          component={Link}
          href="/"
          style={{
            fontSize: 'var(--v-text-sm, 12px)',
            color: 'var(--v-text-tertiary, #999999)',
            marginTop: 8,
          }}
        >
          {t('error.footerLink')}
        </Anchor>
      </Stack>
    </div>
  );
}
