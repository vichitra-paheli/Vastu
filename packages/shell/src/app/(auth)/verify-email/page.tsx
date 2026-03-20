import { Suspense } from 'react';
import type { Metadata } from 'next';
import { VerifyEmailContent } from '@/components/auth/VerifyEmailContent';
import { FormSkeleton } from '@/components/shared/FormSkeleton';

export const metadata: Metadata = {
  title: 'Verify Email — Vastu',
  description: 'Check your inbox to verify your email address',
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={1} />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
