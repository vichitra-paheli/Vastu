import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MfaChallengeForm } from '../../../components/auth/MfaChallengeForm';
import { FormSkeleton } from '../../../components/shared/FormSkeleton';

export const metadata: Metadata = {
  title: 'Two-Factor Authentication — Vastu',
  description: 'Enter your authentication code to access your Vastu workspace',
};

export default function MfaPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={1} />}>
      <MfaChallengeForm />
    </Suspense>
  );
}
