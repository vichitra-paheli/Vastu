import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '../theme/vastu.tokens.css';

import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { vastuTheme } from '../theme';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vastu',
  description: 'Enterprise web application framework',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable}`}
        style={{
          fontFamily: 'var(--font-inter), var(--v-font-sans)',
        }}
      >
        <MantineProvider theme={vastuTheme} defaultColorScheme="auto">
          <Notifications position="bottom-right" limit={3} />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
