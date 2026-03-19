import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '../../../components/auth/ResetPasswordForm';
import { FormSkeleton } from '../../../components/shared/FormSkeleton';

export const metadata: Metadata = {
  title: 'Set New Password — Vastu',
  description: 'Set a new password for your Vastu account',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={2} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
