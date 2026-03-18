import type { Metadata } from 'next';
import { SsoForm } from '../../../components/auth/SsoForm';

export const metadata: Metadata = {
  title: 'Single Sign-On — Vastu',
  description: 'Sign in to your Vastu workspace using your organization SSO provider',
};

export default function SsoPage() {
  return <SsoForm />;
}
