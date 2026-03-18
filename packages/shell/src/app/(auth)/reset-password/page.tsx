import type { Metadata } from 'next';
import { ResetPasswordForm } from '../../../components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Set New Password — Vastu',
  description: 'Set a new password for your Vastu account',
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
