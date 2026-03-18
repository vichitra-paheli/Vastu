import type { Metadata } from 'next';
import { MfaChallengeForm } from '../../../components/auth/MfaChallengeForm';

export const metadata: Metadata = {
  title: 'Two-Factor Authentication — Vastu',
  description: 'Enter your authentication code to access your Vastu workspace',
};

export default function MfaPage() {
  return <MfaChallengeForm />;
}
