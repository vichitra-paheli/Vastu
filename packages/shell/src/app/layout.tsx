import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@/theme/vastu.tokens.css';

import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { vastuTheme } from '@/theme';

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Retrieve locale and message catalog for the current request.
  // Both read from the next-intl request config (src/i18n.ts).
  // Messages are passed to NextIntlClientProvider so that client
  // components can use `useTranslations()` without an additional fetch.
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable}`}
        style={{
          fontFamily: 'var(--font-inter), var(--v-font-sans)',
        }}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MantineProvider theme={vastuTheme} defaultColorScheme="auto">
            <Notifications position="bottom-right" limit={3} />
            {children}
          </MantineProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
