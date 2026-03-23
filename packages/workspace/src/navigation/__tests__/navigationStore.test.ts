/**
 * Tests for navigationStore — cross-page navigation intent storage.
 *
 * Implements US-209e (VASTU-2A-209).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useNavigationStore, getNavigationIntent } from '../../stores/navigationStore';
import type { NavigationIntent } from '../types';

function resetStore() {
  useNavigationStore.getState().clearAllIntents();
}

describe('navigationStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('setIntent', () => {
    it('stores a navigation intent keyed by panel ID', () => {
      const intent: NavigationIntent = {
        targetPageId: 'f1-driver-profile',
        recordId: 'driver-42',
      };

      useNavigationStore.getState().setIntent('panel-1', intent);

      const { intents } = useNavigationStore.getState();
      expect(intents['panel-1']).toEqual(intent);
    });

    it('overwrites an existing intent for the same panel ID', () => {
      const intent1: NavigationIntent = { targetPageId: 'page-a', recordId: 'rec-1' };
      const intent2: NavigationIntent = { targetPageId: 'page-b', recordId: 'rec-2' };

      useNavigationStore.getState().setIntent('panel-1', intent1);
      useNavigationStore.getState().setIntent('panel-1', intent2);

      expect(useNavigationStore.getState().intents['panel-1']).toEqual(intent2);
    });

    it('stores intents for multiple panels independently', () => {
      const intentA: NavigationIntent = { targetPageId: 'page-a', recordId: 'rec-1' };
      const intentB: NavigationIntent = { targetPageId: 'page-b', recordId: 'rec-2' };

      useNavigationStore.getState().setIntent('panel-1', intentA);
      useNavigationStore.getState().setIntent('panel-2', intentB);

      expect(useNavigationStore.getState().intents['panel-1']).toEqual(intentA);
      expect(useNavigationStore.getState().intents['panel-2']).toEqual(intentB);
    });
  });

  describe('consumeIntent', () => {
    it('returns the intent and removes it from the store', () => {
      const intent: NavigationIntent = {
        targetPageId: 'f1-races',
        recordId: 'race-5',
        sourcePageId: 'dashboard',
        sourcePageName: 'Dashboard',
      };

      useNavigationStore.getState().setIntent('panel-x', intent);
      const consumed = useNavigationStore.getState().consumeIntent('panel-x');

      expect(consumed).toEqual(intent);
      // Intent is removed after consumption
      expect(useNavigationStore.getState().intents['panel-x']).toBeUndefined();
    });

    it('returns undefined when no intent is pending for the panel', () => {
      const result = useNavigationStore.getState().consumeIntent('panel-nonexistent');
      expect(result).toBeUndefined();
    });

    it('does not affect other panels when consuming one intent', () => {
      const intentA: NavigationIntent = { targetPageId: 'page-a', recordId: 'rec-1' };
      const intentB: NavigationIntent = { targetPageId: 'page-b', recordId: 'rec-2' };

      useNavigationStore.getState().setIntent('panel-1', intentA);
      useNavigationStore.getState().setIntent('panel-2', intentB);

      useNavigationStore.getState().consumeIntent('panel-1');

      expect(useNavigationStore.getState().intents['panel-1']).toBeUndefined();
      expect(useNavigationStore.getState().intents['panel-2']).toEqual(intentB);
    });

    it('can only consume an intent once (second call returns undefined)', () => {
      const intent: NavigationIntent = { targetPageId: 'page-a', recordId: 'rec-1' };
      useNavigationStore.getState().setIntent('panel-1', intent);

      const first = useNavigationStore.getState().consumeIntent('panel-1');
      const second = useNavigationStore.getState().consumeIntent('panel-1');

      expect(first).toEqual(intent);
      expect(second).toBeUndefined();
    });
  });

  describe('clearIntent', () => {
    it('removes an intent without returning it', () => {
      const intent: NavigationIntent = { targetPageId: 'page-a', recordId: 'rec-1' };
      useNavigationStore.getState().setIntent('panel-1', intent);

      useNavigationStore.getState().clearIntent('panel-1');

      expect(useNavigationStore.getState().intents['panel-1']).toBeUndefined();
    });

    it('is a no-op for panels with no pending intent', () => {
      // Should not throw
      expect(() => {
        useNavigationStore.getState().clearIntent('panel-nonexistent');
      }).not.toThrow();
    });
  });

  describe('clearAllIntents', () => {
    it('removes all pending intents', () => {
      useNavigationStore.getState().setIntent('panel-1', { targetPageId: 'a', recordId: '1' });
      useNavigationStore.getState().setIntent('panel-2', { targetPageId: 'b', recordId: '2' });
      useNavigationStore.getState().setIntent('panel-3', { targetPageId: 'c', recordId: '3' });

      useNavigationStore.getState().clearAllIntents();

      expect(useNavigationStore.getState().intents).toEqual({});
    });
  });

  describe('getNavigationIntent helper', () => {
    it('returns and consumes the intent for the given panel ID', () => {
      const intent: NavigationIntent = {
        targetPageId: 'f1-constructor-detail',
        recordId: 'constructor-7',
        params: { season: '2024' },
      };

      useNavigationStore.getState().setIntent('target-panel', intent);

      const result = getNavigationIntent('target-panel');

      expect(result).toEqual(intent);
      // Should be consumed (cleared) after reading
      expect(useNavigationStore.getState().intents['target-panel']).toBeUndefined();
    });

    it('returns undefined when no intent is pending', () => {
      const result = getNavigationIntent('panel-with-no-intent');
      expect(result).toBeUndefined();
    });
  });

  describe('NavigationIntent shape', () => {
    it('stores all optional fields correctly', () => {
      const intent: NavigationIntent = {
        targetPageId: 'f1-driver-profile',
        recordId: 'driver-1',
        params: { tab: 'results' },
        filters: { season: 2024 },
        focusRecordId: 'race-result-99',
        sourcePageId: 'f1-races',
        sourcePageName: 'Races',
      };

      useNavigationStore.getState().setIntent('panel-full', intent);
      const consumed = useNavigationStore.getState().consumeIntent('panel-full');

      expect(consumed).toEqual(intent);
      expect(consumed?.params).toEqual({ tab: 'results' });
      expect(consumed?.filters).toEqual({ season: 2024 });
      expect(consumed?.focusRecordId).toBe('race-result-99');
      expect(consumed?.sourcePageId).toBe('f1-races');
      expect(consumed?.sourcePageName).toBe('Races');
    });

    it('handles intent with only required fields', () => {
      const intent: NavigationIntent = { targetPageId: 'some-page' };

      useNavigationStore.getState().setIntent('panel-minimal', intent);
      const consumed = useNavigationStore.getState().consumeIntent('panel-minimal');

      expect(consumed?.targetPageId).toBe('some-page');
      expect(consumed?.recordId).toBeUndefined();
      expect(consumed?.params).toBeUndefined();
      expect(consumed?.filters).toBeUndefined();
    });
  });
});
