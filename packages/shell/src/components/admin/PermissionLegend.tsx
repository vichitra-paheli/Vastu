'use client';

/**
 * PermissionLegend — Legend explaining the CRUD badge notation and color coding.
 *
 * Shown at the bottom of the permission matrix.
 * Design: compact horizontal row of badge samples with labels.
 *
 * Design System: Style Guide §4 (Colors), §2 (Typography)
 */

import { Group, Text, Box, Stack } from '@mantine/core';
import { t } from '@/lib/i18n';

interface LegendBadgeProps {
  label: string;
  description: string;
  color: string;
  textColor: string;
}

function LegendBadge({ label, description, color, textColor }: LegendBadgeProps) {
  return (
    <Group gap={6} align="center" wrap="nowrap">
      <Box
        style={{
          backgroundColor: color,
          color: textColor,
          width: 20,
          height: 20,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--v-text-xs)',
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {label}
      </Box>
      <Text fz="var(--v-text-sm)" style={{ color: 'var(--v-text-secondary)' }}>
        {description}
      </Text>
    </Group>
  );
}

export function PermissionLegend() {
  return (
    <Stack gap="xs">
      <Text
        fz="var(--v-text-sm)"
        fw={500}
        style={{ color: 'var(--v-text-secondary)' }}
      >
        {t('permissions.legend.title')}
      </Text>
      <Group gap="xl" wrap="wrap">
        {/* Action badges */}
        <LegendBadge
          label="V"
          description={t('permissions.legend.view')}
          color="var(--v-status-success)"
          textColor="var(--v-text-inverse)"
        />
        <LegendBadge
          label="E"
          description={t('permissions.legend.edit')}
          color="var(--v-status-success)"
          textColor="var(--v-text-inverse)"
        />
        <LegendBadge
          label="D"
          description={t('permissions.legend.delete')}
          color="var(--v-status-success)"
          textColor="var(--v-text-inverse)"
        />
        <LegendBadge
          label="X"
          description={t('permissions.legend.export')}
          color="var(--v-status-success)"
          textColor="var(--v-text-inverse)"
        />

        {/* State colors */}
        <Group gap={6} align="center" wrap="nowrap">
          <Box
            style={{
              backgroundColor: 'var(--v-status-success)',
              width: 20,
              height: 20,
              borderRadius: 4,
              flexShrink: 0,
            }}
          />
          <Text fz="var(--v-text-sm)" style={{ color: 'var(--v-text-secondary)' }}>
            {t('permissions.legend.granted')}
          </Text>
        </Group>

        <Group gap={6} align="center" wrap="nowrap">
          <Box
            style={{
              backgroundColor: 'var(--v-bg-tertiary)',
              width: 20,
              height: 20,
              borderRadius: 4,
              flexShrink: 0,
            }}
          />
          <Text fz="var(--v-text-sm)" style={{ color: 'var(--v-text-secondary)' }}>
            {t('permissions.legend.denied')}
          </Text>
        </Group>

        <Group gap={6} align="center" wrap="nowrap">
          <Box
            style={{
              backgroundColor: 'var(--v-accent-tertiary)',
              width: 20,
              height: 20,
              borderRadius: 4,
              flexShrink: 0,
            }}
          />
          <Text fz="var(--v-text-sm)" style={{ color: 'var(--v-text-secondary)' }}>
            {t('permissions.legend.conditional')}
          </Text>
        </Group>
      </Group>
    </Stack>
  );
}
