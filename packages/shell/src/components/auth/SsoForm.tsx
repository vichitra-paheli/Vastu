'use client';

/**
 * SsoForm — Client-side SSO provider lookup form.
 *
 * Flow:
 *   1. User enters their work email.
 *   2. On submit, the form calls GET /api/auth/sso/providers?email={email}.
 *   3a. Single provider found  → auto-redirect to Keycloak via signIn().
 *   3b. Multiple providers     → render a provider selection list with SAML/OIDC badges.
 *   3c. No providers found     → render an inline error with a hint.
 *   3d. Network/API error      → render a generic error alert.
 *
 * Design: Patterns Library §9 (Forms) — inline validation on blur, * for required fields.
 * All colors via --v-* CSS tokens. All strings via t().
 */

import React from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import {
  TextInput,
  Button,
  Anchor,
  Stack,
  Text,
  Alert,
  Badge,
  UnstyledButton,
  Group,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle, IconChevronRight } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import type { SsoProvider, SsoProvidersResponse } from '../../types/sso';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'no_providers' }
  | { status: 'providers'; providers: SsoProvider[] }
  | { status: 'error'; message: string };

interface SsoFormValues {
  email: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate the email input field.
 * Returns an error message string if invalid, null if valid.
 */
function validateEmail(value: string): string | null {
  if (!value.trim()) {
    return 'Email is required';
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) {
    return 'Enter a valid email address';
  }
  return null;
}

/**
 * Fetch SSO providers for the given email from the API route.
 * Throws on HTTP errors so the caller can distinguish network vs. no-providers.
 */
async function fetchProviders(email: string): Promise<SsoProvider[]> {
  const params = new URLSearchParams({ email });
  const res = await fetch(`/api/auth/sso/providers?${params.toString()}`);

  if (!res.ok) {
    throw new Error(`Provider lookup failed with status ${res.status}`);
  }

  const data: SsoProvidersResponse = (await res.json()) as SsoProvidersResponse;
  return data.providers;
}

// ---------------------------------------------------------------------------
// Protocol badge component
// ---------------------------------------------------------------------------

function ProtocolBadge({ protocol }: { protocol: SsoProvider['protocol'] }) {
  const color = protocol === 'SAML' ? 'var(--v-accent-quaternary)' : 'var(--v-accent-primary)';
  const bg =
    protocol === 'SAML' ? 'var(--v-accent-quaternary-light)' : 'var(--v-accent-primary-light)';

  return (
    <Badge
      size="xs"
      style={{
        backgroundColor: bg,
        color,
        border: 'none',
        fontWeight: 'var(--v-font-medium)',
        fontSize: 'var(--v-text-xs)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {protocol}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Provider list item component
// ---------------------------------------------------------------------------

interface ProviderItemProps {
  provider: SsoProvider;
  onSelect: (provider: SsoProvider) => void;
  isLoading: boolean;
}

function ProviderItem({ provider, onSelect, isLoading }: ProviderItemProps) {
  return (
    <UnstyledButton
      onClick={() => onSelect(provider)}
      disabled={isLoading}
      style={{
        width: '100%',
        padding: 'var(--v-space-3) var(--v-space-4)',
        borderRadius: 'var(--v-radius-md)',
        border: '1px solid var(--v-border-default)',
        backgroundColor: 'var(--v-bg-primary)',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading ? 0.6 : 1,
        transition: 'background-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            'var(--v-interactive-hover)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--v-bg-primary)';
      }}
      aria-label={`Sign in with ${provider.name} (${provider.protocol})`}
    >
      <Group justify="space-between" align="center">
        <Group gap="var(--v-space-2)" align="center">
          <Text fw={500} fz="var(--v-text-md)" c="var(--v-text-primary)">
            {provider.name}
          </Text>
          <ProtocolBadge protocol={provider.protocol} />
        </Group>
        <IconChevronRight
          size={16}
          style={{ color: 'var(--v-text-tertiary)', flexShrink: 0 }}
          aria-hidden={true}
        />
      </Group>
    </UnstyledButton>
  );
}

// ---------------------------------------------------------------------------
// Main form component
// ---------------------------------------------------------------------------

export function SsoForm() {
  const [lookupState, setLookupState] = React.useState<LookupState>({ status: 'idle' });
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  // Store the submitted email so provider-select handler can pass it as a login hint.
  const [submittedEmail, setSubmittedEmail] = React.useState('');

  const form = useForm<SsoFormValues>({
    mode: 'uncontrolled',
    initialValues: { email: '' },
    validateInputOnBlur: true,
    validate: {
      email: validateEmail,
    },
  });

  async function handleSubmit(values: SsoFormValues) {
    setLookupState({ status: 'loading' });
    setSubmittedEmail(values.email);

    try {
      const providers = await fetchProviders(values.email);

      if (providers.length === 0) {
        setLookupState({ status: 'no_providers' });
        return;
      }

      if (providers.length === 1 && providers[0]) {
        // AC-2: Single provider — redirect immediately.
        setIsRedirecting(true);
        await signIn('keycloak', {
          callbackUrl: '/workspace',
          login_hint: values.email,
          kc_idp_hint: providers[0].keycloakAlias,
        });
        return;
      }

      // AC-3: Multiple providers — show selection list.
      setLookupState({ status: 'providers', providers });
    } catch {
      setLookupState({ status: 'error', message: t('sso.loadError') });
    }
  }

  async function handleProviderSelect(provider: SsoProvider) {
    setIsRedirecting(true);
    await signIn('keycloak', {
      callbackUrl: '/workspace',
      login_hint: submittedEmail,
      kc_idp_hint: provider.keycloakAlias,
    });
  }

  const isLoading = lookupState.status === 'loading' || isRedirecting;

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* Title */}
      <Stack gap="xs">
        <Text
          fw={500}
          fz="var(--v-text-2xl)"
          c="var(--v-text-primary)"
          component="h1"
          style={{ margin: 0 }}
        >
          {t('sso.title')}
        </Text>
        <Text fz="var(--v-text-md)" c="var(--v-text-secondary)">
          {t('sso.subtitle')}
        </Text>
      </Stack>

      {/* Email form */}
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">
          <TextInput
            label={t('sso.email.label')}
            placeholder={t('sso.email.placeholder')}
            type="email"
            autoComplete="email"
            required
            withAsterisk
            {...form.getInputProps('email')}
          />

          <Button
            type="submit"
            fullWidth
            loading={isLoading}
            style={{
              backgroundColor: 'var(--v-accent-primary)',
              marginTop: 'var(--v-space-2)',
            }}
          >
            {t('sso.submit')}
          </Button>
        </Stack>
      </form>

      {/* No providers error */}
      {lookupState.status === 'no_providers' && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertCircle size={16} />}
          role="alert"
          style={{
            borderColor: 'var(--v-status-error)',
            backgroundColor: 'var(--v-status-error-light)',
            color: 'var(--v-status-error)',
          }}
        >
          <Text fz="var(--v-text-sm)" fw={500} c="var(--v-status-error)">
            {t('sso.noProviders')}
          </Text>
          <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)" mt="var(--v-space-1)">
            {t('sso.noProviders.hint')}
          </Text>
        </Alert>
      )}

      {/* Generic load error */}
      {lookupState.status === 'error' && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertCircle size={16} />}
          role="alert"
          style={{
            borderColor: 'var(--v-status-error)',
            backgroundColor: 'var(--v-status-error-light)',
            color: 'var(--v-status-error)',
          }}
        >
          {lookupState.message}
        </Alert>
      )}

      {/* Provider selection list */}
      {lookupState.status === 'providers' && (
        <Stack gap="sm">
          <Divider
            label={t('sso.selectProvider')}
            labelPosition="center"
            styles={{
              label: { color: 'var(--v-text-tertiary)', fontSize: 'var(--v-text-sm)' },
            }}
          />
          {lookupState.providers.map((provider) => (
            <ProviderItem
              key={provider.id}
              provider={provider}
              onSelect={handleProviderSelect}
              isLoading={isRedirecting}
            />
          ))}
        </Stack>
      )}

      {/* Back to sign in link */}
      <Text ta="center" fz="var(--v-text-sm)" c="var(--v-text-secondary)">
        <Anchor
          component={Link}
          href="/login"
          c="var(--v-accent-primary)"
          fz="var(--v-text-sm)"
        >
          {t('sso.backToLogin')}
        </Anchor>
      </Text>
    </Stack>
  );
}
