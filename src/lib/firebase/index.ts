/**
 * Firebase Realtime Database
 * Main exports for Firebase integration
 */

export {
  getFirebaseApp,
  getFirebaseDatabase,
  getFirebaseAuth,
  initializeFirebaseAuth,
  isFirebaseAuthenticated,
  isFirebaseAvailable,
  ENABLE_FIREBASE_REALTIME,
} from './config';

export {
  subscribeToSession,
  subscribeToSessionBySpace,
  subscribeToSessionInfo,
  subscribeToOrderQueue,
  subscribeToOrderQueueBySpace,
  subscribeToParticipants,
  subscribeToParticipantsBySpace,
  getConnectionState,
  onConnectionStateChange,
  reconnect,
  disconnect,
  type RealtimeSessionData,
} from './realtime.service';
