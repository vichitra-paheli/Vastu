import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '../../../components/auth/LoginForm';
import { FormSkeleton } from '../../../components/shared/FormSkeleton';

export const metadata: Metadata = {
  title: 'Sign In — Vastu',
  description: 'Sign in to your Vastu workspace',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={2} />}>
      <LoginForm />
    </Suspense>
  );
}
