/**
 * Settings — Appearance page.
 * US-018: Appearance settings.
 *
 * Server component: loads the user's current appearance preferences from
 * the database and renders the AppearanceSettings client component with
 * initial values. Subsequent changes are auto-saved client-side via
 * PATCH /api/settings/appearance.
 */

import type { Metadata } from 'next';
import { prisma } from '@vastu/shared/prisma';
import { getSession } from '@/lib/session';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';

export const metadata: Metadata = {
  title: 'Appearance — Vastu',
  description: 'Customize color scheme, accent color, and display density',
};

export default async function AppearancePage() {
  const session = await getSession();

  // Default values used when there is no session (middleware prevents this
  // in production, but the fallback keeps the component well-typed).
  let colorScheme: 'light' | 'dark' | 'auto' = 'auto';
  let accentColor = '#4C6EF5';
  let density: 'compact' | 'comfortable' | 'spacious' = 'comfortable';

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { colorScheme: true, accentColor: true, density: true },
    });

    if (user) {
      const cs = user.colorScheme;
      if (cs === 'light' || cs === 'dark') {
        colorScheme = cs;
      } else if (cs === 'auto' || cs === 'system') {
        // 'system' is the Prisma default; map to 'auto' for Mantine
        colorScheme = 'auto';
      }

      if (user.accentColor) {
        accentColor = user.accentColor;
      }

      const d = user.density;
      if (d === 'compact' || d === 'comfortable' || d === 'spacious') {
        density = d;
      }
    }
  }

  return (
    <AppearanceSettings
      initialColorScheme={colorScheme}
      initialAccentColor={accentColor}
      initialDensity={density}
    />
  );
}
