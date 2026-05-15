'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { sessionService } from '@/services/session.service';
import { useSession } from '@/contexts/SessionContext';
import { useCart } from '@/contexts/CartContext';
import { setInStorage } from '@/mocks/mockStorage';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { LoginModal } from '@/components/session/LoginModal';
import type { OrderingSessionData } from '@/types/api/session';

// Helper to check if logo URL is valid and non-empty
function hasValidLogo(logo: string | undefined | null): logo is string {
  return typeof logo === 'string' && logo.trim().length > 0;
}

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const { setPreviewSession, sessionData, isLoading: isSessionLoading, endSession } = useSession();
  const { clearCart } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [spaceData, setSpaceData] = useState<OrderingSessionData | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const spaceId = params.spaceId as string;

    const init = async () => {
      // if session is loading, wait for it to load
      if (isSessionLoading) return
      // Check if user already has an active session for THIS space
      const existingUserId = localStorage.getItem(STORAGE_KEYS.SESSION_USER_ID);
      const existingSessionData = sessionData?.session;

      if (existingUserId && existingSessionData?.status === 'active'
        && existingSessionData.spaceId === spaceId) {
        // Same space — back button case, resume existing session
        console.log('[SpacePage] User already has active session for this space, redirecting to menu');
        router.replace('/menu');
        return;
      }

      // Any other case — different space, area flow, or stale session. Clean everything.
      if (existingUserId && existingSessionData?.status === 'active') {
        console.log('[SpacePage] Different session detected, ending previous session');
        try {
          await endSession('left');
        } catch (e) {
          console.error('[SpacePage] Failed to end previous session:', e);
        }
      }

      // Clear ALL stale data — ensures no area flow leakage.
      // Reuses the central registry: see src/lib/storage-keys.ts.
      clearCart();
      setInStorage(STORAGE_KEYS.FLOW_TYPE, 'space');
      localStorage.removeItem(STORAGE_KEYS.AREA_ID);
      localStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
      localStorage.removeItem(STORAGE_KEYS.SESSION_USER_ID);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ORDER_ID);
      localStorage.removeItem(STORAGE_KEYS.SPLIT);
      localStorage.removeItem(STORAGE_KEYS.ITEMIZED_SELECTIONS);
      localStorage.removeItem(STORAGE_KEYS.KITCHEN_NOTE);
      localStorage.removeItem(STORAGE_KEYS.TIP);
      localStorage.removeItem(STORAGE_KEYS.RESTAURANT_CONTEXT);

      // Fetch new space data
      try {
        if (!spaceId) {
          setError('Invalid space ID');
          setIsLoading(false);
          return;
        }

        console.log('[SpacePage] Fetching session for spaceId:', spaceId);

        // Fetch ordering session data (preview only, not persisted yet)
        const response = await sessionService.getSessionBySpaceId(spaceId);

        console.log('[SpacePage] Space/Session info fetched:', {
          businessName: response.data.business?.businessName,
          spaceName: response.data.space?.name,
          hasActiveSession: !!response.data.session,
          sessionStatus: response.data.session?.status || 'No session yet',
          participantsCount: response.data.participantsCount || 0,
        });

        // Validate space and business (NOT session - session can be created later!)
        if (!response.data.space) {
          setError('Invalid space. Please check the QR code.');
          setIsLoading(false);
          return;
        }

        if (!response.data.business) {
          setError('Business information not found. Please contact the restaurant staff.');
          setIsLoading(false);
          return;
        }

        // Check if there's an existing session and it's not active
        // (Only block if session exists but is closed/ended)
        if (response.data.session && response.data.session.status !== 'active') {
          setError(`The ordering session for this table is ${response.data.session.status}. Please contact the restaurant staff or scan again.`);
          setIsLoading(false);
          return;
        }

        // Store as PREVIEW session only (ephemeral, not saved to localStorage)
        console.log('[SpacePage] Setting preview session (NOT saved to localStorage yet)');
        if (response.data.session) {
          console.log('[SpacePage] Active session exists - user will JOIN it');
        } else {
          console.log('[SpacePage] No active session - user will CREATE one');
        }
        setPreviewSession(response.data);

        // Store space data for displaying and passing to modal
        setSpaceData(response.data);
        setIsLoading(false);

        // Show login modal after data is loaded
        setShowLoginModal(true);
      } catch (err) {
        console.error('[SpacePage] Error fetching session data:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load session data. Please try scanning the QR code again.'
        );
        setIsLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.spaceId, sessionData?.session, isSessionLoading]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading your session" />;
  }

  // Show space info with login modal
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Background content - Restaurant/Space Info */}
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        {/* Restaurant Logo/Name */}
        {hasValidLogo(spaceData?.business?.logo) ? (
          <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-lg bg-gray-100 mb-6">
            <Image
              src={spaceData.business.logo}
              alt={`${spaceData?.business?.displayName || spaceData?.business?.businessName || 'Business'} logo`}
              fill
              className="object-contain"
              sizes="96px"
              unoptimized // Required for external Firebase URLs
              onError={(e) => {
                // Hide image on error
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div
            className="h-20 rounded-xl shadow-lg flex items-center justify-center text-2xl font-bold text-white px-8 mb-6"
            style={{ backgroundColor: '#000000' }}
          >
            {spaceData?.business?.businessName || 'morsel'}
          </div>
        )}

        {/* Space/Table Info */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-semibold text-gray-800">
            {spaceData?.space?.name || 'Welcome'}
          </h1>
          {spaceData?.session && (
            <p className="text-sm text-gray-500 mt-2">
              {spaceData.participantsCount || 0} guest{(spaceData.participantsCount || 0) !== 1 ? 's' : ''} at this table
            </p>
          )}
        </div>

        {/* Subtle prompt */}
        <p className="text-gray-400 text-sm">Enter your name to continue</p>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        previewSession={spaceData}
      />
    </div>
  );
}
