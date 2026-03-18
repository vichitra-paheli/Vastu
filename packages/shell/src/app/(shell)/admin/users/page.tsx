/**
 * Admin — Users page (placeholder).
 *
 * Full implementation in a later issue. This stub makes the shell layout
 * testable and verifies the admin route renders correctly for admin users.
 */

import type { Metadata } from 'next';
import { Text } from '@mantine/core';

export const metadata: Metadata = {
  title: 'User Management — Vastu',
};

export default function AdminUsersPage() {
  return (
    <Text fz="var(--v-text-md)" c="var(--v-text-primary)">
      User management
    </Text>
  );
}
