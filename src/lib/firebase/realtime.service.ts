/**
 * Firebase Realtime Database Service
 *
 * Provides real-time subscriptions for session data including:
 * - Order queue updates
 * - Participant changes
 * - Session status updates
 *
 * Features:
 * - Automatic reconnection
 * - Connection state monitoring
 * - Error handling with fallback
 * - Performance optimized with selective listening
 */

import {
  ref,
  onValue,
  off,
  get,
  DatabaseReference,
  Unsubscribe,
  onDisconnect,
  goOnline,
  goOffline,
} from 'firebase/database';
import { getFirebaseDatabase, isFirebaseAvailable } from './config';
import type { SessionDetail, SessionOrderQueue, SessionParticipant } from '@/types/api/session';

// Connection state
let connectionState: 'connected' | 'disconnected' | 'error' = 'disconnected';

// Connection state listeners
const connectionStateListeners: Set<(state: 'connected' | 'disconnected' | 'error') => void> = new Set();

/**
 * Update connection state and notify listeners
 */
function updateConnectionState(newState: 'connected' | 'disconnected' | 'error') {
  if (connectionState !== newState) {
    connectionState = newState;
    console.log('[Firebase Realtime] Connection state changed:', newState);
    connectionStateListeners.forEach(listener => listener(newState));
  }
}

/**
 * Get current connection state
 */
export function getConnectionState() {
  return connectionState;
}

/**
 * Subscribe to connection state changes
 */
export function onConnectionStateChange(callback: (state: 'connected' | 'disconnected' | 'error') => void): () => void {
  connectionStateListeners.add(callback);
  // Immediately call with current state
  callback(connectionState);

  // Return unsubscribe function
  return () => {
    connectionStateListeners.delete(callback);
  };
}

/**
 * Manually go online (reconnect)
 */
export function reconnect() {
  const db = getFirebaseDatabase();
  if (db) {
    goOnline(db);
    console.log('[Firebase Realtime] 🔌 Reconnecting...');
  }
}

/**
 * Manually go offline (disconnect)
 */
export function disconnect() {
  const db = getFirebaseDatabase();
  if (db) {
    goOffline(db);
    console.log('[Firebase Realtime] 🔌 Disconnecting...');
  }
}

/**
 * Session data structure in Firebase
 */
export interface RealtimeSessionData {
  status: string;
  expiresAt: number;
  participants: Record<string, SessionParticipant>;
  orderQueue: Record<string, SessionOrderQueue>;
  lastUpdated: number;
}

/**
 * Subscribe to real-time session updates
 *
 * @param sessionId - The session ID to subscribe to
 * @param onUpdate - Callback when session data updates
 * @param onError - Optional callback for errors
 * @returns Unsubscribe function (call to stop listening)
 */
export function subscribeToSession(
  sessionId: string,
  onUpdate: (data: Partial<SessionDetail>) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDatabase();

  // Return null if Firebase is not available
  if (!db) {
    console.log('[Firebase Realtime] Firebase not available, using polling fallback');
    return null;
  }

  try {
    const sessionRef = ref(db, `sessions/${sessionId}`);

    console.log('[Firebase Realtime] 🔄 Subscribing to session:', sessionId.substring(0, 8) + '...');

    // Set up real-time listener
    const unsubscribe = onValue(
      sessionRef,
      (snapshot) => {
        updateConnectionState('connected');
        const data = snapshot.val() as RealtimeSessionData | null;

        if (data) {
          console.log('[Firebase Realtime] 📥 Received update:', {
            sessionId: sessionId.substring(0, 8) + '...',
            participantsCount: Object.keys(data.participants || {}).length,
            queueCount: Object.keys(data.orderQueue || {}).length,
          });

          // Convert Firebase format to API format
          const sessionDetail: Partial<SessionDetail> = {
            id: sessionId,
            status: data.status,
            participants: Object.values(data.participants || {}),
            orderQueue: Object.values(data.orderQueue || {}),
          };

          onUpdate(sessionDetail);
        } else {
          console.warn('[Firebase Realtime] ⚠️ Session data is null');
        }
      },
      (error) => {
        updateConnectionState('error');
        console.error('[Firebase Realtime] ❌ Error listening to session:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );

    return () => {
      console.log('[Firebase Realtime] 🔌 Unsubscribing from session:', sessionId.substring(0, 8) + '...');
      off(sessionRef);
      unsubscribe();
    };
  } catch (error) {
    console.error('[Firebase Realtime] ❌ Failed to subscribe to session:', error);
    if (onError) {
      onError(error as Error);
    }
    return null;
  }
}

/**
 * Subscribe to order queue updates only
 * More efficient than subscribing to entire session
 *
 * @param sessionId - The session ID
 * @param onUpdate - Callback when order queue updates
 * @param onError - Optional callback for errors
 * @returns Unsubscribe function
 */
export function subscribeToOrderQueue(
  sessionId: string,
  onUpdate: (orderQueue: SessionOrderQueue[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDatabase();

  if (!db) {
    console.log('[Firebase Realtime] ⚠️ Database not available for subscribeToOrderQueue');
    return null;
  }

  try {
    const queueRef = ref(db, `sessions/${sessionId}/orderQueue`);

    console.log('[Firebase Realtime] 🔄 Subscribing to order queue:', {
      sessionId: sessionId.substring(0, 8) + '...',
      path: `sessions/${sessionId}/orderQueue`,
      refExists: !!queueRef
    });

    const unsubscribe = onValue(
      queueRef,
      (snapshot) => {
        updateConnectionState('connected');
        const data = snapshot.val();

        console.log('[Firebase Realtime] 📥 Queue snapshot received:', {
          hasData: !!data,
          dataType: typeof data,
          keys: data ? Object.keys(data).length : 0
        });

        if (data) {
          const orderQueue = Object.values(data) as SessionOrderQueue[];
          console.log('[Firebase Realtime] 📦 Queue updated:', {
            entries: orderQueue.length,
            participants: orderQueue.map(q => ({
              sessionUserId: q.sessionUserId?.substring(0, 8) + '...',
              itemsCount: q.items?.length || 0
            }))
          });
          onUpdate(orderQueue);
        } else {
          console.log('[Firebase Realtime] ℹ️ Queue snapshot is empty, calling onUpdate with empty array');
          onUpdate([]);
        }
      },
      (error) => {
        updateConnectionState('error');
        console.error('[Firebase Realtime] ❌ Error listening to queue:', {
          error: error.message,
          code: (error as any).code,
          sessionId: sessionId.substring(0, 8) + '...'
        });
        if (onError) {
          onError(error as Error);
        }
      }
    );

    console.log('[Firebase Realtime] ✅ Queue subscription created successfully');

    return () => {
      console.log('[Firebase Realtime] 🔌 Unsubscribing from queue:', sessionId.substring(0, 8) + '...');
      off(queueRef);
      unsubscribe();
    };
  } catch (error) {
    console.error('[Firebase Realtime] ❌ Failed to subscribe to queue:', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: sessionId.substring(0, 8) + '...'
    });
    if (onError) {
      onError(error as Error);
    }
    return null;
  }
}

/**
 * Subscribe to participants updates only
 * More efficient than subscribing to entire session
 *
 * @param sessionId - The session ID
 * @param onUpdate - Callback when participants update
 * @param onError - Optional callback for errors
 * @returns Unsubscribe function
 */
export function subscribeToParticipants(
  sessionId: string,
  onUpdate: (participants: SessionParticipant[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDatabase();

  if (!db) {
    return null;
  }

  try {
    const participantsRef = ref(db, `sessions/${sessionId}/participants`);

    console.log('[Firebase Realtime] 🔄 Subscribing to participants:', sessionId.substring(0, 8) + '...');

    const unsubscribe = onValue(
      participantsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const participants = Object.values(data) as SessionParticipant[];
          console.log('[Firebase Realtime] 👥 Participants updated:', participants.length);
          onUpdate(participants);
        }
      },
      (error) => {
        console.error('[Firebase Realtime] ❌ Error listening to participants:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );

    return () => {
      off(participantsRef);
      unsubscribe();
    };
  } catch (error) {
    console.error('[Firebase Realtime] ❌ Failed to subscribe to participants:', error);
    if (onError) {
      onError(error as Error);
    }
    return null;
  }
}

/**
 * Check if Firebase Realtime is available
 */
export { isFirebaseAvailable };
