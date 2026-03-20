import { RootProvider } from 'fumadocs-ui/provider';
import 'fumadocs-ui/style.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    template: '%s | Vastu Docs',
    default: 'Vastu Docs',
  },
  description: 'Developer documentation for the Vastu enterprise web application framework.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
