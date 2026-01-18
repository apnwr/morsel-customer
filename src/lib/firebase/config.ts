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
import { getAuth, signInAnonymously, Auth, onAuthStateChanged } from 'firebase/auth';

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
let firebaseAuth: Auth | null = null;
let authInitialized = false;
let authInitPromise: Promise<void> | null = null;

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
 * Get Firebase Auth instance
 * Returns null if Firebase is disabled or initialization failed
 */
export function getFirebaseAuth(): Auth | null {
  // Return existing auth if already initialized
  if (firebaseAuth) {
    return firebaseAuth;
  }

  // Get Firebase app
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  // Initialize auth
  try {
    firebaseAuth = getAuth(app);
    console.log('[Firebase] ✅ Firebase Auth initialized');
    return firebaseAuth;
  } catch (error) {
    console.error('[Firebase] ❌ Failed to initialize Firebase Auth:', error);
    return null;
  }
}

/**
 * Initialize Firebase Authentication (Anonymous Sign-in)
 * This is required for Firebase Realtime Database access
 * Returns a promise that resolves when auth is complete
 */
export async function initializeFirebaseAuth(): Promise<void> {
  // Return existing promise if already initializing
  if (authInitPromise) {
    return authInitPromise;
  }

  // Return immediately if already initialized
  if (authInitialized) {
    return Promise.resolve();
  }

  // Create initialization promise
  authInitPromise = (async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      console.log('[Firebase Auth] Auth not available, skipping initialization');
      return;
    }

    // Set up auth state listener FIRST
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('[Firebase Auth] 👤 Auth state: signed in', user.uid.substring(0, 8) + '...');
        authInitialized = true;
      } else {
        console.log('[Firebase Auth] 👤 Auth state: signed out');
        authInitialized = false;
      }
    });

    try {
      // Check if already signed in
      if (auth.currentUser) {
        console.log('[Firebase Auth] ✅ Already signed in:', auth.currentUser.uid.substring(0, 8) + '...');
        authInitialized = true;
        return;
      }

      // Sign in anonymously
      console.log('[Firebase Auth] 🔐 Signing in anonymously...');
      await signInAnonymously(auth);
      console.log('[Firebase Auth] ✅ Anonymous sign-in successful');

      // Small delay to ensure token propagates to database service
      await new Promise(resolve => setTimeout(resolve, 100));

      authInitialized = true;
      console.log('[Firebase Auth] ✅ Auth token ready for database access');
    } catch (error) {
      console.error('[Firebase Auth] ❌ Anonymous sign-in failed:', error);
      authInitialized = false;
      authInitPromise = null;
      throw error;
    }
  })();

  return authInitPromise;
}

/**
 * Check if user is authenticated with Firebase
 */
export function isFirebaseAuthenticated(): boolean {
  const auth = getFirebaseAuth();
  return auth !== null && auth.currentUser !== null;
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
