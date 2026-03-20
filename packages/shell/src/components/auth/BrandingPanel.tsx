/**
 * BrandingPanel — Left side of the auth split layout.
 *
 * Displays the Vastu brand name, tagline, and the decorative Kundli motif.
 * Rendered as a server component (no interactivity required).
 */

import { Stack, Text } from '@mantine/core';
import { KundliMotif } from './KundliMotif';
import classes from './BrandingPanel.module.css';

export function BrandingPanel() {
  return (
    <div className={classes.container}>
      <KundliMotif className={classes.motif} />
      <Stack align="center" gap="sm" className={classes.content}>
        <Text fw={500} fz="xl" c="var(--v-text-primary)">
          Vastu
        </Text>
        <Text fz="sm" c="var(--v-text-secondary)" ta="center">
          Enterprise Application Platform
        </Text>
      </Stack>
    </div>
  );
}
