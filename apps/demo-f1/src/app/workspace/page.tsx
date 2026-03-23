import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workspace — demo-f1',
  description: 'demo-f1 workspace',
};

/**
 * Workspace page — /workspace
 *
 * This is the main entry point for the demo-f1 workspace.
 * The WorkspaceShell component renders the full Dockview-based workspace UI
 * including the sidebar, panels, and page templates.
 *
 * Pages registered in src/pages.ts and formatters in src/formatters.ts
 * are loaded automatically by WorkspaceShell at startup.
 */
export default function WorkspacePage() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'var(--font-inter, sans-serif)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1>demo-f1</h1>
        <p>Workspace ready. Register your pages in <code>src/pages.ts</code>.</p>
      </div>
    </div>
  );
}
