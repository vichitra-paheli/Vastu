import { redirect } from 'next/navigation';

/**
 * Root page — redirects to the workspace.
 * The workspace is the primary entry point for demo-f1.
 */
export default function RootPage() {
  redirect('/workspace');
}
