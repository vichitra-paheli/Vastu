import type { Metadata } from 'next';
import { VerifyEmailContent } from '../../../components/auth/VerifyEmailContent';

export const metadata: Metadata = {
  title: 'Verify Email — Vastu',
  description: 'Check your inbox to verify your email address',
};

export default function VerifyEmailPage() {
  return <VerifyEmailContent />;
}
