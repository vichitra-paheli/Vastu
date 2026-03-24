'use client';

/**
 * Client-side registration of F1 pages and formatters.
 *
 * This component exists solely to run page/formatter registration side-effects
 * in the client bundle. Next.js server components and client components have
 * separate module scopes — registrations must happen in the client bundle
 * where WorkspaceShell and SidebarNav read from the registries.
 */

// Side-effect imports — register F1 pages and formatters in the client bundle.
import '../../pages';
import '../../formatters';

export function AppRegistrations() {
  return null;
}
