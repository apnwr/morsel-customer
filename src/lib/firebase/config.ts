/**
 * Firebase Configuration
 *
 * Environment variables needed:
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_DATABASE_URL
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID (optional)
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database, enableLogging } from 'firebase/database';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Feature flag to enable/disable Firebase
export const ENABLE_FIREBASE_REALTIME = process.env.NEXT_PUBLIC_ENABLE_FIREBASE === 'true';

let firebaseApp: FirebaseApp | null = null;
let firebaseDatabase: Database | null = null;

/**
 * Initialize Firebase app (singleton pattern)
 * Returns null if Firebase is disabled or config is invalid
 */
export function getFirebaseApp(): FirebaseApp | null {
  // Return null if Firebase is disabled
  if (!ENABLE_FIREBASE_REALTIME) {
    console.log('[Firebase] Firebase Realtime DB is disabled via feature flag');
    return null;
  }

  // Check if required config is present
  if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL || !firebaseConfig.projectId) {
    console.warn('[Firebase] Firebase config incomplete. Missing required environment variables.');
    return null;
  }

  // Return existing app if already initialized
  if (firebaseApp) {
    return firebaseApp;
  }

  // Check if app already exists
  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    console.log('[Firebase] Using existing Firebase app');
    return firebaseApp;
  }

  // Initialize new app
  try {
    firebaseApp = initializeApp(firebaseConfig);
    console.log('[Firebase] ✅ Firebase app initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('[Firebase] ❌ Failed to initialize Firebase app:', error);
    return null;
  }
}

/**
 * Get Firebase Realtime Database instance
 * Returns null if Firebase is disabled or initialization failed
 */
export function getFirebaseDatabase(): Database | null {
  // Return existing database if already initialized
  if (firebaseDatabase) {
    return firebaseDatabase;
  }

  // Get Firebase app
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  // Initialize database
  try {
    firebaseDatabase = getDatabase(app);

    // Enable debug logging in development
    if (process.env.NODE_ENV === 'development') {
      enableLogging(true);
      console.log('[Firebase] 🐛 Debug logging enabled');
    }

    console.log('[Firebase] ✅ Firebase Realtime Database initialized');
    return firebaseDatabase;
  } catch (error) {
    console.error('[Firebase] ❌ Failed to initialize Firebase Realtime Database:', error);
    return null;
  }
}

/**
 * Check if Firebase is available and configured
 */
export function isFirebaseAvailable(): boolean {
  const db = getFirebaseDatabase();
  const isAvailable = db !== null;

  console.log('[Firebase] 🔍 Availability check:', {
    isAvailable,
    featureFlag: ENABLE_FIREBASE_REALTIME,
    hasApiKey: !!firebaseConfig.apiKey,
    hasDatabaseURL: !!firebaseConfig.databaseURL,
    hasProjectId: !!firebaseConfig.projectId,
    hasAppId: !!firebaseConfig.appId,
  });

  return isAvailable;
}
