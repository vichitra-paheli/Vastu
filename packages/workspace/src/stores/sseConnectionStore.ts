/**
 * sseConnectionStore — tracks the SSE connection state for the tray bar indicator.
 *
 * Three states:
 * - 'connecting'   — initial state and while waiting to reconnect.
 * - 'connected'    — EventSource is open and healthy.
 * - 'disconnected' — EventSource closed, not currently retrying.
 *
 * Implements US-207 AC-8 (connection status indicator).
 */

import { create } from 'zustand';

/** The possible SSE connection states. */
export type SSEConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface SSEConnectionState {
  /** Current connection status. */
  status: SSEConnectionStatus;

  /** Update the connection status. */
  setStatus: (status: SSEConnectionStatus) => void;
}

export const useSSEConnectionStore = create<SSEConnectionState>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),
}));
