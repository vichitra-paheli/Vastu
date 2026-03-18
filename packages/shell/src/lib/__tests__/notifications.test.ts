import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @mantine/notifications before importing the module under test.
// The notifications object is used as a side-effect-only module — we only
// need to verify that notifications.show is called with the correct params.
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock @tabler/icons-react to avoid SVG rendering concerns in tests.
vi.mock('@tabler/icons-react', () => ({
  IconCheck: 'IconCheck',
  IconAlertCircle: 'IconAlertCircle',
  IconAlertTriangle: 'IconAlertTriangle',
  IconInfoCircle: 'IconInfoCircle',
}));

import { notifications } from '@mantine/notifications';
import { showSuccess, showError, showWarning, showInfo } from '../notifications';

describe('notification helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showSuccess()', () => {
    it('calls notifications.show with autoClose 5000ms', () => {
      showSuccess('Operation succeeded');
      expect(notifications.show).toHaveBeenCalledOnce();
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.autoClose).toBe(5000);
    });

    it('passes message to notifications.show', () => {
      showSuccess('Profile saved');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.message).toBe('Profile saved');
    });

    it('passes optional title to notifications.show', () => {
      showSuccess('Done', 'Success');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.title).toBe('Success');
    });

    it('passes no title when title is omitted', () => {
      showSuccess('Done');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.title).toBeUndefined();
    });

    it('uses green color', () => {
      showSuccess('Done');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.color).toBe('green');
    });
  });

  describe('showError()', () => {
    it('calls notifications.show with autoClose false (persistent)', () => {
      showError('Something went wrong');
      expect(notifications.show).toHaveBeenCalledOnce();
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.autoClose).toBe(false);
    });

    it('passes message to notifications.show', () => {
      showError('Failed to save');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.message).toBe('Failed to save');
    });

    it('passes optional title to notifications.show', () => {
      showError('Failed to save', 'Error');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.title).toBe('Error');
    });

    it('uses red color', () => {
      showError('Done');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.color).toBe('red');
    });
  });

  describe('showWarning()', () => {
    it('calls notifications.show with autoClose 8000ms', () => {
      showWarning('Approaching rate limit');
      expect(notifications.show).toHaveBeenCalledOnce();
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.autoClose).toBe(8000);
    });

    it('passes message to notifications.show', () => {
      showWarning('Approaching rate limit');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.message).toBe('Approaching rate limit');
    });

    it('passes optional title to notifications.show', () => {
      showWarning('Watch out', 'Warning');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.title).toBe('Warning');
    });

    it('uses yellow color', () => {
      showWarning('Done');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.color).toBe('yellow');
    });
  });

  describe('showInfo()', () => {
    it('calls notifications.show with autoClose 5000ms', () => {
      showInfo('Export started');
      expect(notifications.show).toHaveBeenCalledOnce();
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.autoClose).toBe(5000);
    });

    it('passes message to notifications.show', () => {
      showInfo('Export started');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.message).toBe('Export started');
    });

    it('passes optional title to notifications.show', () => {
      showInfo('Export started', 'Info');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.title).toBe('Info');
    });

    it('uses blue color', () => {
      showInfo('Done');
      const call = vi.mocked(notifications.show).mock.calls[0][0];
      expect(call.color).toBe('blue');
    });
  });
});
