/**
 * Unit tests for scripts/vastu-init.ts
 *
 * Tests: validateAppName, findMonorepoRoot, renderTemplate, scaffold
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findMonorepoRoot, renderTemplate, scaffold, validateAppName } from '../vastu-init';

// ---------------------------------------------------------------------------
// validateAppName
// ---------------------------------------------------------------------------

describe('validateAppName', () => {
  it('returns null for valid names', () => {
    expect(validateAppName('my-app')).toBeNull();
    expect(validateAppName('demo-f1')).toBeNull();
    expect(validateAppName('abc')).toBeNull();
    expect(validateAppName('a1b2c3')).toBeNull();
    expect(validateAppName('sales-crm-v2')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(validateAppName('')).not.toBeNull();
    expect(validateAppName('   ')).not.toBeNull();
  });

  it('rejects uppercase letters', () => {
    const err = validateAppName('MyApp');
    expect(err).not.toBeNull();
    expect(err).toContain('lowercase');
  });

  it('rejects names with spaces', () => {
    const err = validateAppName('my app');
    expect(err).not.toBeNull();
    expect(err).toContain('spaces');
  });

  it('rejects names starting with a number', () => {
    const err = validateAppName('1myapp');
    expect(err).not.toBeNull();
    expect(err).toContain('lowercase letter');
  });

  it('rejects names starting with a hyphen', () => {
    const err = validateAppName('-myapp');
    expect(err).not.toBeNull();
  });

  it('rejects names with special characters', () => {
    expect(validateAppName('my_app')).not.toBeNull();
    expect(validateAppName('my.app')).not.toBeNull();
    expect(validateAppName('my@app')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// renderTemplate
// ---------------------------------------------------------------------------

describe('renderTemplate', () => {
  it('substitutes {{APP_NAME}} with the given app name', () => {
    const result = renderTemplate('Hello {{APP_NAME}}!', 'demo-f1');
    expect(result).toBe('Hello demo-f1!');
  });

  it('replaces all occurrences', () => {
    const result = renderTemplate('{{APP_NAME}} and {{APP_NAME}}', 'myapp');
    expect(result).toBe('myapp and myapp');
  });

  it('leaves content without placeholder unchanged', () => {
    const result = renderTemplate('no placeholders here', 'myapp');
    expect(result).toBe('no placeholders here');
  });

  it('handles multiline content', () => {
    const tmpl = `name: "@app/{{APP_NAME}}"\nversion: "0.0.0"`;
    const result = renderTemplate(tmpl, 'my-crm');
    expect(result).toBe(`name: "@app/my-crm"\nversion: "0.0.0"`);
  });
});

// ---------------------------------------------------------------------------
// findMonorepoRoot
// ---------------------------------------------------------------------------

describe('findMonorepoRoot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vastu-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('finds the monorepo root by pnpm-workspace.yaml', () => {
    // Create: tmpDir/pnpm-workspace.yaml
    fs.writeFileSync(path.join(tmpDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');

    // Start searching from a subdirectory
    const subDir = path.join(tmpDir, 'packages', 'my-pkg');
    fs.mkdirSync(subDir, { recursive: true });

    const result = findMonorepoRoot(subDir);
    expect(result).toBe(tmpDir);
  });

  it('returns null when no pnpm-workspace.yaml is found', () => {
    const subDir = path.join(tmpDir, 'some', 'nested', 'dir');
    fs.mkdirSync(subDir, { recursive: true });

    // No pnpm-workspace.yaml anywhere in tmpDir
    const result = findMonorepoRoot(subDir);
    expect(result).toBeNull();
  });

  it('returns the immediate directory if it contains pnpm-workspace.yaml', () => {
    fs.writeFileSync(path.join(tmpDir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
    const result = findMonorepoRoot(tmpDir);
    expect(result).toBe(tmpDir);
  });
});

// ---------------------------------------------------------------------------
// scaffold (integration test using real filesystem)
// ---------------------------------------------------------------------------

describe('scaffold', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vastu-scaffold-'));
    // Create a pnpm-workspace.yaml so it looks like a monorepo root
    fs.writeFileSync(path.join(tmpRoot, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n  - "apps/*"\n');
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('creates the expected directory structure', () => {
    const appName = 'test-app';
    const appsDir = path.join(tmpRoot, 'apps');
    const targetDir = path.join(appsDir, appName);

    scaffold({
      appName,
      monorepoRoot: tmpRoot,
      appsDir,
      targetDir,
    });

    // Verify expected files exist
    const expectedFiles = [
      'package.json',
      'next.config.mjs',
      'tsconfig.json',
      'prisma/schema.prisma',
      'prisma/seed.ts',
      'src/pages.ts',
      'src/formatters.ts',
      'README.md',
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/app/workspace/page.tsx',
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(targetDir, file);
      expect(fs.existsSync(filePath), `Expected file to exist: ${file}`).toBe(true);
    }
  });

  it('substitutes APP_NAME in all files', () => {
    const appName = 'my-crm';
    const appsDir = path.join(tmpRoot, 'apps');
    const targetDir = path.join(appsDir, appName);

    scaffold({
      appName,
      monorepoRoot: tmpRoot,
      appsDir,
      targetDir,
    });

    // Check package.json has the correct name
    const pkgJson = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf-8'));
    expect(pkgJson.name).toBe('@app/my-crm');

    // Check README has correct app name
    const readme = fs.readFileSync(path.join(targetDir, 'README.md'), 'utf-8');
    expect(readme).toContain('my-crm');
    expect(readme).not.toContain('{{APP_NAME}}');

    // Check schema has correct app name in comment
    const schema = fs.readFileSync(path.join(targetDir, 'prisma/schema.prisma'), 'utf-8');
    expect(schema).toContain('my-crm');
    expect(schema).not.toContain('{{APP_NAME}}');
  });

  it('creates apps/ directory if it does not exist', () => {
    const appName = 'brand-new-app';
    const appsDir = path.join(tmpRoot, 'apps');
    const targetDir = path.join(appsDir, appName);

    expect(fs.existsSync(appsDir)).toBe(false);

    scaffold({
      appName,
      monorepoRoot: tmpRoot,
      appsDir,
      targetDir,
    });

    expect(fs.existsSync(appsDir)).toBe(true);
    expect(fs.existsSync(targetDir)).toBe(true);
  });

  it('schema contains the domain section marker', () => {
    const appName = 'test-schema';
    const appsDir = path.join(tmpRoot, 'apps');
    const targetDir = path.join(appsDir, appName);

    scaffold({
      appName,
      monorepoRoot: tmpRoot,
      appsDir,
      targetDir,
    });

    const schema = fs.readFileSync(path.join(targetDir, 'prisma/schema.prisma'), 'utf-8');
    expect(schema).toContain('YOUR DOMAIN MODELS BELOW');
  });

  it('seed.ts imports runBaseSeed from @vastu/shared/prisma', () => {
    const appName = 'test-seed';
    const appsDir = path.join(tmpRoot, 'apps');
    const targetDir = path.join(appsDir, appName);

    scaffold({
      appName,
      monorepoRoot: tmpRoot,
      appsDir,
      targetDir,
    });

    const seedContent = fs.readFileSync(path.join(targetDir, 'prisma/seed.ts'), 'utf-8');
    expect(seedContent).toContain("from '@vastu/shared/prisma'");
    expect(seedContent).toContain('runBaseSeed');
  });
});
