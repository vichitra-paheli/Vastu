/**
 * Auth layout — centered layout for login and other auth pages.
 */
import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--v-bg-secondary)',
      }}
    >
      {children}
    </main>
  );
}
