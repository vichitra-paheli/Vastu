/**
 * CI sync check: base-schema.prisma vs schema.prisma
 *
 * Verifies that packages/shared/prisma/base-schema.prisma contains
 * all the same model names as packages/shared/src/prisma/schema.prisma.
 *
 * This prevents the base schema template from drifting out of sync
 * with the actual framework schema over time.
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

function extractModelNames(schemaContent: string): Set<string> {
  const modelPattern = /^model\s+(\w+)\s*\{/gm;
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = modelPattern.exec(schemaContent)) !== null) {
    names.add(match[1]);
  }
  return names;
}

describe('base-schema.prisma sync with schema.prisma', () => {
  const sharedDir = path.resolve(__dirname, '../../..');

  const liveSchemaPath = path.join(sharedDir, 'src/prisma/schema.prisma');
  const baseSchemaPath = path.join(sharedDir, 'prisma/base-schema.prisma');

  it('base-schema.prisma file exists', () => {
    expect(fs.existsSync(baseSchemaPath)).toBe(true);
  });

  it('schema.prisma file exists', () => {
    expect(fs.existsSync(liveSchemaPath)).toBe(true);
  });

  it('base-schema.prisma contains all model names from schema.prisma', () => {
    const liveContent = fs.readFileSync(liveSchemaPath, 'utf-8');
    const baseContent = fs.readFileSync(baseSchemaPath, 'utf-8');

    const liveModels = extractModelNames(liveContent);
    const baseModels = extractModelNames(baseContent);

    const missingFromBase = [...liveModels].filter((m) => !baseModels.has(m));

    if (missingFromBase.length > 0) {
      throw new Error(
        `base-schema.prisma is out of sync with schema.prisma.\n` +
          `Missing models: ${missingFromBase.join(', ')}\n\n` +
          `To fix: copy the missing model definitions from\n` +
          `  packages/shared/src/prisma/schema.prisma\n` +
          `into\n` +
          `  packages/shared/prisma/base-schema.prisma\n`,
      );
    }

    expect(missingFromBase).toHaveLength(0);
  });

  it('schema.prisma contains no models absent from base-schema.prisma template', () => {
    const liveContent = fs.readFileSync(liveSchemaPath, 'utf-8');
    const baseContent = fs.readFileSync(baseSchemaPath, 'utf-8');

    const liveModels = extractModelNames(liveContent);
    const baseModels = extractModelNames(baseContent);

    // base-schema may have same or subset of live models
    // (base-schema should not have MORE models than live schema)
    const extraInBase = [...baseModels].filter((m) => !liveModels.has(m));
    if (extraInBase.length > 0) {
      throw new Error(
        `base-schema.prisma has model(s) not found in schema.prisma: ${extraInBase.join(', ')}\n` +
          `Remove extra models from base-schema.prisma or add them to schema.prisma.\n`,
      );
    }

    expect(extraInBase).toHaveLength(0);
  });
});
