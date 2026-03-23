/**
 * pages/index.ts — barrel export for the page registry.
 *
 * Import from this module to access the page registry API.
 *
 * Implements VASTU-2A-206.
 */

export {
  registerPage,
  getAllPages,
  getPageById,
  mergeWithDynamic,
  unregisterPage,
  clearPageRegistry,
} from './registry';

export type { PageDefinition, MergedPage, PageSection } from './types';
