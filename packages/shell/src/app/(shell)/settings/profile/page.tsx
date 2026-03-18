/**
 * Settings — Profile page (placeholder).
 *
 * Full implementation in a later issue. This stub makes the shell layout
 * testable and verifies the route renders correctly.
 */

import type { Metadata } from 'next';
import { Text } from '@mantine/core';

export const metadata: Metadata = {
  title: 'Profile — Vastu',
};

export default function ProfilePage() {
  return (
    <Text fz="var(--v-text-md)" c="var(--v-text-primary)">
      Profile settings
    </Text>
  );
}
