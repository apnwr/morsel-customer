/**
 * Firebase Realtime Database
 * Main exports for Firebase integration
 */

export {
  getFirebaseApp,
  getFirebaseDatabase,
  isFirebaseAvailable,
  ENABLE_FIREBASE_REALTIME,
} from './config';

export {
  subscribeToSession,
  subscribeToOrderQueue,
  subscribeToParticipants,
  getConnectionState,
  onConnectionStateChange,
  reconnect,
  disconnect,
  type RealtimeSessionData,
} from './realtime.service';
