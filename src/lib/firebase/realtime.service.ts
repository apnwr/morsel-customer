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
  Unsubscribe,
  goOnline,
  goOffline,
} from 'firebase/database';
import { getFirebaseDatabase, isFirebaseAvailable, initializeFirebaseAuth } from './config';
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
 * Subscribe to session info by spaceId
 * Uses actual Firebase structure: activeSessionsBySpace/{spaceId}/sessionInfo
 *
 * @param spaceId - The space ID
 * @param onUpdate - Callback when session data updates
 * @param onError - Optional callback for errors
 * @returns Unsubscribe function
 */
export function subscribeToSessionBySpace(
  spaceId: string,
  onUpdate: (data: Partial<SessionDetail>) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDatabase();

  if (!db) {
    console.log('[Firebase Realtime] Firebase not available, using polling fallback');
    return null;
  }

  // Initialize auth before subscribing
  initializeFirebaseAuth()
    .then(() => {
      console.log('[Firebase Realtime] ✅ Auth initialized, ready to subscribe (by space)');
    })
    .catch((error) => {
      console.error('[Firebase Realtime] ❌ Auth initialization failed:', error);
      if (onError) {
        onError(error);
      }
    });

  try {
    const sessionRef = ref(db, `activeSessionsBySpace/${spaceId}/sessionInfo`);

    console.log('[Firebase Realtime] 🔄 Subscribing to session info by space:', {
      spaceId: spaceId.substring(0, 8) + '...',
      path: `activeSessionsBySpace/${spaceId}/sessionInfo`
    });

    const unsubscribe = onValue(
      sessionRef,
      (snapshot) => {
        updateConnectionState('connected');
        const data = snapshot.val();

        if (data) {
          console.log('[Firebase Realtime] 📥 Session info received (by space):', {
            sessionId: data.id?.substring(0, 8) + '...',
            participantsCount: data.participantsCount,
            ordersCount: data.ordersCount
          });

          // Convert Firebase format to API format
          const sessionDetail: Partial<SessionDetail> = {
            id: data.id,
            spaceId: data.spaceId,
            businessId: data.businessId,
            status: data.status,
            participants: Array.isArray(data.participants) ? data.participants : [],
            orderQueue: Array.isArray(data.orderQueue) ? data.orderQueue : [],
            orders: Array.isArray(data.orders) ? data.orders : [],
          };

          onUpdate(sessionDetail);
        } else {
          console.warn('[Firebase Realtime] ⚠️ Session info is null');
        }
      },
      (error) => {
        updateConnectionState('error');
        console.error('[Firebase Realtime] ❌ Error listening to session (by space):', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );

    return () => {
      console.log('[Firebase Realtime] 🔌 Unsubscribing from session (by space):', spaceId.substring(0, 8) + '...');
      off(sessionRef);
      unsubscribe();
    };
  } catch (error) {
    console.error('[Firebase Realtime] ❌ Failed to subscribe to session (by space):', error);
    if (onError) {
      onError(error as Error);
    }
    return null;
  }
}

/**
 * Subscribe to real-time session updates (OLD - using sessionId)
 *
 * @deprecated Use subscribeToSessionBySpace instead
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

  // Initialize auth before subscribing
  initializeFirebaseAuth()
    .then(() => {
      console.log('[Firebase Realtime] ✅ Auth initialized, ready to subscribe');
    })
    .catch((error) => {
      console.error('[Firebase Realtime] ❌ Auth initialization failed:', error);
      if (onError) {
        onError(error);
      }
    });

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
 * Subscribe to order queue by spaceId
 * Uses actual Firebase structure: activeSessionsBySpace/{spaceId}/sessionInfo/orderQueue
 *
 * @param spaceId - The space ID
 * @param onUpdate - Callback when order queue updates
 * @param onError - Optional callback for errors
 * @returns Unsubscribe function
 */
export function subscribeToOrderQueueBySpace(
  spaceId: string,
  onUpdate: (orderQueue: SessionOrderQueue[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDatabase();

  if (!db) {
    console.log('[Firebase Realtime] ⚠️ Database not available for subscribeToOrderQueueBySpace');
    return null;
  }

  // Initialize auth before subscribing
  initializeFirebaseAuth()
    .then(() => {
      console.log('[Firebase Realtime] ✅ Auth initialized for queue subscription (by space)');
    })
    .catch((error) => {
      console.error('[Firebase Realtime] ❌ Auth initialization failed:', error);
      if (onError) {
        onError(error);
      }
    });

  try {
    const queueRef = ref(db, `activeSessionsBySpace/${spaceId}/sessionInfo/orderQueue`);

    console.log('[Firebase Realtime] 🔄 Subscribing to order queue by space:', {
      spaceId: spaceId.substring(0, 8) + '...',
      path: `activeSessionsBySpace/${spaceId}/sessionInfo/orderQueue`
    });

    const unsubscribe = onValue(
      queueRef,
      (snapshot) => {
        updateConnectionState('connected');
        const data = snapshot.val();

        console.log('[Firebase Realtime] 📥 Queue snapshot received (by space):', {
          hasData: !!data,
          dataType: typeof data,
          isArray: Array.isArray(data),
          length: Array.isArray(data) ? data.length : 0
        });

        if (data) {
          // Firebase structure has orderQueue as an array
          let orderQueue: SessionOrderQueue[];

          if (Array.isArray(data)) {
            // Filter out null/undefined entries
            orderQueue = data.filter(item => item !== null && item !== undefined);
          } else {
            // Shouldn't happen based on your structure, but fallback
            orderQueue = [];
          }

          console.log('[Firebase Realtime] 📦 Queue updated (by space):', {
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
        console.error('[Firebase Realtime] ❌ Error listening to queue (by space):', {
          error: error.message,
          code: (error as any).code,
          spaceId: spaceId.substring(0, 8) + '...'
        });
        if (onError) {
          onError(error as Error);
        }
      }
    );

    console.log('[Firebase Realtime] ✅ Queue subscription created successfully (by space)');

    return () => {
      console.log('[Firebase Realtime] 🔌 Unsubscribing from queue (by space):', spaceId.substring(0, 8) + '...');
      off(queueRef);
      unsubscribe();
    };
  } catch (error) {
    console.error('[Firebase Realtime] ❌ Failed to subscribe to queue (by space):', {
      error: error instanceof Error ? error.message : String(error),
      spaceId: spaceId.substring(0, 8) + '...'
    });
    if (onError) {
      onError(error as Error);
    }
    return null;
  }
}

/**
 * Subscribe to the full sessionInfo node by spaceId and sessionId.
 * Provides real-time updates for participants, orderQueue, status, timezone, currency, etc.
 * Path: activeSessionsBySpace/{spaceId}/{sessionId}/sessionInfo
 *
 * @param spaceId - The space ID
 * @param sessionId - The session ID
 * @param onUpdate - Callback when session info updates
 * @param onError - Optional callback for errors
 * @returns Unsubscribe function
 */
export function subscribeToSessionInfo(
  spaceId: string,
  sessionId: string,
  onUpdate: (data: Partial<SessionDetail>) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDatabase();

  if (!db) {
    console.log('[Firebase Realtime] Firebase not available, using polling fallback');
    return null;
  }

  let unsubscribeRef: Unsubscribe | null = null;

  initializeFirebaseAuth()
    .then(() => {
      console.log('[Firebase Realtime] ✅ Auth initialized, setting up sessionInfo subscription');

      try {
        const sessionInfoRef = ref(db, `activeSessionsBySpace/${spaceId}/${sessionId}/sessionInfo`);

        console.log('[Firebase Realtime] 🔄 Subscribing to sessionInfo:', {
          spaceId: spaceId.substring(0, 8) + '...',
          sessionId: sessionId.substring(0, 8) + '...',
          path: `activeSessionsBySpace/${spaceId}/${sessionId}/sessionInfo`
        });

        const unsubscribe = onValue(
          sessionInfoRef,
          (snapshot) => {
            updateConnectionState('connected');
            const data = snapshot.val();

            if (data) {
              console.log('[Firebase Realtime] 📥 SessionInfo received:', {
                sessionId: data.id?.substring(0, 8) + '...',
                participantsCount: data.participantsCount,
                ordersCount: data.ordersCount,
                status: data.status,
                timezone: data.timezone || '(not set)',
              });

              // Handle participants: array or sparse object
              let participants: SessionParticipant[] = [];
              if (Array.isArray(data.participants)) {
                participants = data.participants.filter((p: unknown) => p !== null && p !== undefined);
              } else if (data.participants && typeof data.participants === 'object') {
                participants = Object.values(data.participants).filter((p: unknown) => p !== null && p !== undefined) as SessionParticipant[];
              }

              // Handle orderQueue: array or sparse object
              let orderQueue: SessionOrderQueue[] = [];
              if (Array.isArray(data.orderQueue)) {
                orderQueue = data.orderQueue.filter((q: unknown) => q !== null && q !== undefined);
              } else if (data.orderQueue && typeof data.orderQueue === 'object') {
                orderQueue = Object.values(data.orderQueue).filter((q: unknown) => q !== null && q !== undefined) as SessionOrderQueue[];
              }

              const sessionDetail: Partial<SessionDetail> = {
                id: data.id,
                spaceId: data.spaceId,
                businessId: data.businessId,
                status: data.status,
                participants,
                orderQueue,
                orders: Array.isArray(data.orders) ? data.orders : [],
                timezone: data.timezone || undefined,
                currency: data.currency || undefined,
              };

              onUpdate(sessionDetail);
            } else {
              console.warn('[Firebase Realtime] ⚠️ SessionInfo is null');
            }
          },
          (error) => {
            updateConnectionState('error');
            console.error('[Firebase Realtime] ❌ Error listening to sessionInfo:', error);
            if (onError) {
              onError(error as Error);
            }
          }
        );

        unsubscribeRef = () => {
          console.log('[Firebase Realtime] 🔌 Unsubscribing from sessionInfo:', sessionId.substring(0, 8) + '...');
          off(sessionInfoRef);
          unsubscribe();
        };
      } catch (error) {
        console.error('[Firebase Realtime] ❌ Failed to subscribe to sessionInfo:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    })
    .catch((error) => {
      console.error('[Firebase Realtime] ❌ Auth initialization failed:', error);
      if (onError) {
        onError(error);
      }
    });

  return () => {
    if (unsubscribeRef) {
      unsubscribeRef();
    }
  };
}

/**
 * Subscribe to order queue updates by spaceId and sessionId
 * Uses actual Firebase structure: activeSessionsBySpace/{spaceId}/{sessionId}/sessionInfo/orderQueue
 *
 * @param spaceId - The space ID
 * @param sessionId - The session ID
 * @param onUpdate - Callback when order queue updates
 * @param onError - Optional callback for errors
 * @returns Unsubscribe function
 */
export function subscribeToOrderQueue(
  spaceId: string,
  sessionId: string,
  onUpdate: (orderQueue: SessionOrderQueue[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDatabase();

  if (!db) {
    console.log('[Firebase Realtime] ⚠️ Database not available for subscribeToOrderQueue');
    return null;
  }

  let unsubscribeRef: Unsubscribe | null = null;

  // Initialize auth FIRST, then set up listener
  initializeFirebaseAuth()
    .then(() => {
      console.log('[Firebase Realtime] ✅ Auth initialized, setting up queue subscription');

      try {
        const queueRef = ref(db, `activeSessionsBySpace/${spaceId}/${sessionId}/sessionInfo/orderQueue`);

        console.log('[Firebase Realtime] 🔄 Subscribing to order queue:', {
          spaceId: spaceId.substring(0, 8) + '...',
          sessionId: sessionId.substring(0, 8) + '...',
          path: `activeSessionsBySpace/${spaceId}/${sessionId}/sessionInfo/orderQueue`
        });

        const unsubscribe = onValue(
          queueRef,
          (snapshot) => {
            updateConnectionState('connected');
            const data = snapshot.val();

            console.log('[Firebase Realtime] 📥 Queue snapshot received:', {
              hasData: !!data,
              dataType: Array.isArray(data) ? 'array' : typeof data,
              isObject: typeof data === 'object',
              keys: data && typeof data === 'object' ? Object.keys(data) : []
            });

            if (data) {
              let orderQueue: SessionOrderQueue[];

              // Handle both array format and object-with-numeric-keys format
              if (Array.isArray(data)) {
                // True array - filter out null entries
                orderQueue = data.filter(q => q !== null && q !== undefined) as SessionOrderQueue[];
              } else if (typeof data === 'object') {
                // Object with numeric keys (Firebase sparse array format)
                orderQueue = Object.values(data).filter(q => q !== null && q !== undefined) as SessionOrderQueue[];
              } else {
                orderQueue = [];
              }

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

        unsubscribeRef = () => {
          console.log('[Firebase Realtime] 🔌 Unsubscribing from queue:', sessionId.substring(0, 8) + '...');
          off(queueRef);
          unsubscribe();
        };

        console.log('[Firebase Realtime] ✅ Queue subscription created successfully');
      } catch (error) {
        console.error('[Firebase Realtime] ❌ Failed to subscribe to queue:', {
          error: error instanceof Error ? error.message : String(error),
          sessionId: sessionId.substring(0, 8) + '...'
        });
        if (onError) {
          onError(error as Error);
        }
      }
    })
    .catch((error) => {
      console.error('[Firebase Realtime] ❌ Auth initialization failed:', error);
      if (onError) {
        onError(error);
      }
    });

  // Return unsubscribe function that cleans up when ready
  return () => {
    if (unsubscribeRef) {
      unsubscribeRef();
    }
  };
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

  let unsubscribeRef: Unsubscribe | null = null;

  // Initialize auth FIRST, then set up listener
  initializeFirebaseAuth()
    .then(() => {
      console.log('[Firebase Realtime] ✅ Auth initialized, setting up participants subscription');

      try {
        const participantsRef = ref(db, `sessions/${sessionId}/participants`);

        console.log('[Firebase Realtime] 🔄 Subscribing to participants:', {
          sessionId: sessionId.substring(0, 8) + '...',
          path: `sessions/${sessionId}/participants`,
          fullPath: participantsRef.toString()
        });

        // Test one-time read to verify data exists
        get(participantsRef)
          .then((snapshot) => {
            console.log('[Firebase Realtime] 🧪 One-time read test:', {
              exists: snapshot.exists(),
              hasData: !!snapshot.val(),
              data: snapshot.val()
            });
          })
          .catch((error) => {
            console.error('[Firebase Realtime] 🧪❌ One-time read failed:', error);
          });

        const unsubscribe = onValue(
          participantsRef,
          (snapshot) => {
            updateConnectionState('connected');
            const data = snapshot.val();

            console.log('[Firebase Realtime] 📥 Participants snapshot received:', {
              hasData: !!data,
              dataType: typeof data,
              isNull: data === null,
              keys: data ? Object.keys(data) : []
            });

            if (data) {
              const participants = Object.values(data) as SessionParticipant[];
              console.log('[Firebase Realtime] 👥 Participants updated:', {
                count: participants.length,
                participants: participants.map(p => ({
                  sessionUserId: p.sessionUserId?.substring(0, 8) + '...',
                  guestName: p.guestName
                }))
              });
              onUpdate(participants);
            } else {
              console.log('[Firebase Realtime] ⚠️ Participants data is null or empty');
              onUpdate([]);
            }
          },
          (error) => {
            updateConnectionState('error');
            console.error('[Firebase Realtime] ❌ Error listening to participants:', error);
            if (onError) {
              onError(error as Error);
            }
          }
        );

        unsubscribeRef = () => {
          off(participantsRef);
          unsubscribe();
        };
      } catch (error) {
        console.error('[Firebase Realtime] ❌ Failed to subscribe to participants:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    })
    .catch((error) => {
      console.error('[Firebase Realtime] ❌ Auth initialization failed:', error);
      if (onError) {
        onError(error);
      }
    });

  // Return unsubscribe function that cleans up when ready
  return () => {
    if (unsubscribeRef) {
      unsubscribeRef();
    }
  };
}

/**
 * Subscribe to participants updates by spaceId and sessionId
 * Uses actual Firebase structure: activeSessionsBySpace/{spaceId}/{sessionId}/sessionInfo/participants
 *
 * @param spaceId - The space ID
 * @param sessionId - The session ID
 * @param onUpdate - Callback when participants update
 * @param onError - Optional callback for errors
 * @returns Unsubscribe function
 */
export function subscribeToParticipantsBySpace(
  spaceId: string,
  sessionId: string,
  onUpdate: (participants: SessionParticipant[]) => void,
  onError?: (error: Error) => void
): Unsubscribe | null {
  const db = getFirebaseDatabase();

  if (!db) {
    return null;
  }

  let unsubscribeRef: Unsubscribe | null = null;

  // Initialize auth FIRST, then set up listener
  initializeFirebaseAuth()
    .then(() => {
      console.log('[Firebase Realtime] ✅ Auth initialized, setting up participants subscription (by space)');

      try {
        const participantsRef = ref(db, `activeSessionsBySpace/${spaceId}/${sessionId}/sessionInfo/participants`);

        console.log('[Firebase Realtime] 🔄 Subscribing to participants (by space):', {
          spaceId: spaceId.substring(0, 8) + '...',
          sessionId: sessionId.substring(0, 8) + '...',
          path: `activeSessionsBySpace/${spaceId}/${sessionId}/sessionInfo/participants`
        });

        // Test one-time read to verify data exists
        get(participantsRef)
          .then((snapshot) => {
            console.log('[Firebase Realtime] 🧪 One-time read test (by space):', {
              exists: snapshot.exists(),
              hasData: !!snapshot.val(),
              dataType: Array.isArray(snapshot.val()) ? 'array' : typeof snapshot.val(),
              count: Array.isArray(snapshot.val()) ? snapshot.val().length : 0
            });
          })
          .catch((error) => {
            console.error('[Firebase Realtime] 🧪❌ One-time read failed (by space):', error);
          });

        const unsubscribe = onValue(
          participantsRef,
          (snapshot) => {
            updateConnectionState('connected');
            const data = snapshot.val();

            console.log('[Firebase Realtime] 📥 Participants snapshot received (by space):', {
              hasData: !!data,
              dataType: Array.isArray(data) ? 'array' : typeof data,
              isObject: typeof data === 'object',
              isNull: data === null,
              keys: data && typeof data === 'object' ? Object.keys(data) : []
            });

            if (data) {
              let participants: SessionParticipant[];

              // Handle both array format and object-with-numeric-keys format
              if (Array.isArray(data)) {
                // True array - filter out null entries
                participants = data.filter(p => p !== null && p !== undefined) as SessionParticipant[];
              } else if (typeof data === 'object') {
                // Object with numeric keys (Firebase sparse array format)
                participants = Object.values(data).filter(p => p !== null && p !== undefined) as SessionParticipant[];
              } else {
                participants = [];
              }

              console.log('[Firebase Realtime] 👥 Participants updated (by space):', {
                count: participants.length,
                participants: participants.map(p => ({
                  sessionUserId: p.sessionUserId?.substring(0, 8) + '...',
                  guestName: p.guestName
                }))
              });
              onUpdate(participants);
            } else {
              console.log('[Firebase Realtime] ⚠️ Participants data is null or empty (by space)');
              onUpdate([]);
            }
          },
          (error) => {
            updateConnectionState('error');
            console.error('[Firebase Realtime] ❌ Error listening to participants (by space):', error);
            if (onError) {
              onError(error as Error);
            }
          }
        );

        unsubscribeRef = () => {
          off(participantsRef);
          unsubscribe();
        };
      } catch (error) {
        console.error('[Firebase Realtime] ❌ Failed to subscribe to participants (by space):', error);
        if (onError) {
          onError(error as Error);
        }
      }
    })
    .catch((error) => {
      console.error('[Firebase Realtime] ❌ Auth initialization failed (by space):', error);
      if (onError) {
        onError(error);
      }
    });

  // Return unsubscribe function that cleans up when ready
  return () => {
    if (unsubscribeRef) {
      unsubscribeRef();
    }
  };
}

/**
 * Check if Firebase Realtime is available
 */
export { isFirebaseAvailable };
