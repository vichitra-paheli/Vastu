import type { Metadata } from 'next';
import { LoginForm } from '../../../components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In — Vastu',
  description: 'Sign in to your Vastu workspace',
};

export default function LoginPage() {
  return <LoginForm />;
}
