/**
 * Test utilities for @vastu/shell component tests.
 *
 * Usage:
 *   import { render, screen, mockAdminUser } from '@/test-utils';
 */

export {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
  userEvent,
  TestProviders,
} from './providers';

export {
  mockAdminUser,
  mockEditorUser,
  mockViewerUser,
  mockSession,
  mockOrganization,
  mockTenant,
  createMockAbilities,
} from './mocks';
