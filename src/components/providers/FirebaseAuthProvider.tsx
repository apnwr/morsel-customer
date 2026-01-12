/**
 * Firebase Authentication Provider
 *
 * Initializes Firebase Anonymous Authentication at app startup
 * This runs once when the app loads and ensures Firebase auth is ready
 * before any component tries to use Firebase Realtime Database.
 *
 * Anonymous auth is invisible to users - no login UI required.
 */

'use client';

import { useEffect, useState } from 'react';
import { initializeFirebaseAuth, isFirebaseAuthenticated, ENABLE_FIREBASE_REALTIME } from '@/lib/firebase';

interface FirebaseAuthProviderProps {
  children: React.ReactNode;
}

export function FirebaseAuthProvider({ children }: FirebaseAuthProviderProps) {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Skip if Firebase is disabled
    if (!ENABLE_FIREBASE_REALTIME) {
      console.log('[FirebaseAuthProvider] Firebase disabled, skipping auth');
      setAuthReady(true);
      return;
    }

    // Initialize Firebase auth (anonymous)
    console.log('[FirebaseAuthProvider] 🚀 Initializing Firebase Authentication...');

    initializeFirebaseAuth()
      .then(() => {
        const authenticated = isFirebaseAuthenticated();
        console.log('[FirebaseAuthProvider] ✅ Auth initialization complete. Authenticated:', authenticated);
        setAuthReady(true);
      })
      .catch((error) => {
        console.error('[FirebaseAuthProvider] ❌ Auth initialization failed:', error);
        // Still set ready to true so app doesn't hang
        // Firebase subscriptions will fall back to polling
        setAuthReady(true);
      });
  }, []);

  // Don't block app loading - render immediately
  // Auth happens in background and Firebase subscriptions will wait for it
  return <>{children}</>;
}
