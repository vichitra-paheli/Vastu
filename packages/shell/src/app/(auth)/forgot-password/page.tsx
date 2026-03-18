import type { Metadata } from 'next';
import { ForgotPasswordForm } from '../../../components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password — Vastu',
  description: 'Request a password reset link for your Vastu account',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
