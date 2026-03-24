#!/usr/bin/env tsx
/**
 * vastu-init.ts — Application scaffold CLI
 *
 * Creates a new Vastu application in apps/<app-name>/ with all required
 * template files. The generated app depends on @vastu/shell, @vastu/workspace,
 * and @vastu/shared and starts immediately with `pnpm dev`.
 *
 * Usage:
 *   pnpm vastu:init <app-name>
 *
 * Rules for app-name:
 *   - Must be lowercase
 *   - Only letters, numbers, and hyphens
 *   - Must start with a letter
 *   - No spaces, no underscores, no dots
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEMPLATES_DIR = path.join(__dirname, 'templates', 'app');
const APP_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScaffoldOptions {
  appName: string;
  monorepoRoot: string;
  appsDir: string;
  targetDir: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates an app name against naming rules.
 * Returns null on success, or an error message string on failure.
 */
export function validateAppName(name: string): string | null {
  if (!name || name.trim() === '') {
    return 'App name is required.';
  }
  if (name !== name.toLowerCase()) {
    return `App name must be lowercase. Did you mean "${name.toLowerCase()}"?`;
  }
  if (!APP_NAME_PATTERN.test(name)) {
    if (/\s/.test(name)) {
      return 'App name must not contain spaces. Use hyphens instead (e.g. "my-app").';
    }
    if (/[A-Z]/.test(name)) {
      return `App name must be lowercase. Did you mean "${name.toLowerCase()}"?`;
    }
    if (/^[^a-z]/.test(name)) {
      return 'App name must start with a lowercase letter.';
    }
    return `App name "${name}" is invalid. Use only lowercase letters, numbers, and hyphens (e.g. "my-app", "demo-f1").`;
  }
  return null;
}

/**
 * Detects the monorepo root by walking up from the current directory
 * looking for pnpm-workspace.yaml.
 */
export function findMonorepoRoot(startDir: string): string | null {
  let dir = startDir;
  const root = path.parse(dir).root;

  while (dir !== root) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

/**
 * Substitutes {{APP_NAME}} placeholder in template content.
 */
export function renderTemplate(content: string, appName: string): string {
  return content.replace(/\{\{APP_NAME\}\}/g, appName);
}

// ---------------------------------------------------------------------------
// File system helpers
// ---------------------------------------------------------------------------

/**
 * Recursively copies a directory tree, rendering templates along the way.
 * Files ending in .tmpl have the suffix stripped and content rendered.
 */
function scaffoldDir(srcDir: string, destDir: string, appName: string): void {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);

    if (entry.isDirectory()) {
      const destPath = path.join(destDir, entry.name);
      scaffoldDir(srcPath, destPath, appName);
    } else if (entry.isFile()) {
      // Strip .tmpl suffix from output filename
      const destName = entry.name.endsWith('.tmpl')
        ? entry.name.slice(0, -5)
        : entry.name;
      const destPath = path.join(destDir, destName);

      const rawContent = fs.readFileSync(srcPath, 'utf-8');
      const rendered = renderTemplate(rawContent, appName);
      fs.writeFileSync(destPath, rendered, 'utf-8');
    }
  }
}

// ---------------------------------------------------------------------------
// Scaffold
// ---------------------------------------------------------------------------

/**
 * Creates all scaffold files for the new app.
 */
export function scaffold(opts: ScaffoldOptions): void {
  const { appName, appsDir, targetDir } = opts;

  // Ensure apps/ directory exists
  if (!fs.existsSync(appsDir)) {
    fs.mkdirSync(appsDir, { recursive: true });
    console.log(`  created apps/`);
  }

  // Scaffold all template files
  scaffoldDir(TEMPLATES_DIR, targetDir, appName);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);

  // Print help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
vastu:init — Create a new Vastu application

Usage:
  pnpm vastu:init <app-name>

Arguments:
  app-name   Name for the new application (lowercase, hyphens allowed)
             Examples: my-app, demo-f1, sales-crm

Rules for app-name:
  - Must be lowercase
  - Only letters, numbers, and hyphens
  - Must start with a letter

Output:
  apps/<app-name>/
    package.json                               depends on @vastu/shell, @vastu/workspace, @vastu/shared, next-auth, next-intl
    next.config.mjs                            Next.js config with withNextIntl + transpilePackages
    tsconfig.json                              extends root tsconfig
    prisma/schema.prisma                       base schema + domain placeholder section
    prisma/seed.ts                             calls base seed then domain seed
    messages/en.json                           full Vastu translation catalog
    src/i18n.ts                                next-intl request config
    src/middleware.ts                          route protection middleware
    src/pages.ts                               empty page registrations with example
    src/formatters.ts                          empty formatter registrations with example
    src/lib/auth.ts                            next-auth + Keycloak config
    src/lib/auth.types.ts                      next-auth type augmentations
    src/lib/session.ts                         session helpers for server components
    src/lib/i18n.ts                            synchronous t() wrapper
    src/lib/notifications.ts                   toast notification helpers
    src/theme/vastu.theme.ts                   Mantine theme config
    src/theme/vastu.tokens.css                 CSS custom properties
    src/theme/index.ts                         theme exports
    src/app/layout.tsx                         Next.js root layout with i18n + theme
    src/app/page.tsx                           redirects to /workspace
    src/app/(auth)/layout.tsx                  centered auth layout
    src/app/(auth)/login/page.tsx              Keycloak SSO login page
    src/app/workspace/layout.tsx               workspace layout with auth guard
    src/app/workspace/page.tsx                 workspace mount point
    src/app/api/auth/[...nextauth]/route.ts    next-auth route handler
    src/components/auth/SessionGuard.tsx       session expiry polling component
    README.md                                  getting started instructions
`);
    process.exit(0);
  }

  const appName = args[0];

  // Validate app name
  const nameError = validateAppName(appName ?? '');
  if (nameError) {
    console.error(`\nError: ${nameError}`);
    console.error('Usage: pnpm vastu:init <app-name>');
    console.error('       pnpm vastu:init --help\n');
    process.exit(1);
  }

  // Find monorepo root
  const monorepoRoot = findMonorepoRoot(process.cwd());
  if (!monorepoRoot) {
    console.error('\nError: Could not find monorepo root (no pnpm-workspace.yaml found).');
    console.error('Run this command from inside the Vastu monorepo.\n');
    process.exit(1);
  }

  const appsDir = path.join(monorepoRoot, 'apps');
  const targetDir = path.join(appsDir, appName);

  // Check for existing app
  if (fs.existsSync(targetDir)) {
    console.error(`\nError: apps/${appName}/ already exists.`);
    console.error('Choose a different app name or delete the existing directory first.\n');
    process.exit(1);
  }

  // Verify templates exist
  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error(`\nError: Template directory not found: ${TEMPLATES_DIR}`);
    console.error('Make sure scripts/templates/app/ exists in the monorepo root.\n');
    process.exit(1);
  }

  console.log(`\nCreating Vastu application: ${appName}`);
  console.log(`Location: apps/${appName}/\n`);

  scaffold({ appName, monorepoRoot, appsDir, targetDir });

  console.log(`\nScaffold complete! Next steps:\n`);
  console.log(`  1. Install dependencies:`);
  console.log(`       pnpm install\n`);
  console.log(`  2. Set DATABASE_URL in .env (see apps/${appName}/.env.example if created)`);
  console.log(`\n  3. Run migrations:`);
  console.log(`       pnpm --filter @app/${appName} prisma:migrate\n`);
  console.log(`  4. Seed the database:`);
  console.log(`       pnpm --filter @app/${appName} prisma:seed\n`);
  console.log(`  5. Start the dev server:`);
  console.log(`       pnpm --filter @app/${appName} dev\n`);
  console.log(`  Then open http://localhost:3001\n`);
  console.log(`Add your domain tables in:    apps/${appName}/prisma/schema.prisma`);
  console.log(`Register your pages in:       apps/${appName}/src/pages.ts`);
  console.log(`Register your formatters in:  apps/${appName}/src/formatters.ts\n`);
}

// Only run main() when executed directly, not when imported (e.g., in tests)
// Using require.main === module for CommonJS, or checking import.meta for ESM.
// tsx runs scripts in CJS mode by default.
if (require.main === module) {
  main();
}
