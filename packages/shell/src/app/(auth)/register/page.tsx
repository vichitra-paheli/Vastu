import type { Metadata } from 'next';
import { RegisterForm } from '../../../components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account — Vastu',
  description: 'Create your Vastu account and organization',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
