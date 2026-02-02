'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { sessionService } from '@/services/session.service';
import { useSession } from '@/contexts/SessionContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { LoginModal } from '@/components/session/LoginModal';
import type { OrderingSessionData } from '@/types/api/session';

// Helper to check if logo URL is valid and non-empty
function hasValidLogo(logo: string | undefined | null): logo is string {
  return typeof logo === 'string' && logo.trim().length > 0;
}

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const { setPreviewSession, sessionData } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [spaceData, setSpaceData] = useState<OrderingSessionData | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // Check if user already has an active session for this space
    // This handles the back button case - redirect to menu instead of showing login again
    const existingUserId = localStorage.getItem('morsel_session_user_id');
    const existingSessionData = sessionData?.session;

    if (existingUserId && existingSessionData?.status === 'active') {
      const currentSpaceId = params.spaceId as string;
      // If user already has a session (same or different space), go to menu
      console.log('[SpacePage] User already has active session, redirecting to menu');
      router.replace('/menu');
      return;
    }

    const fetchSessionData = async () => {
      try {
        const spaceId = params.spaceId as string;

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

    fetchSessionData();
  }, [params.spaceId, router, setPreviewSession, sessionData]);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading your session...</p>
        </div>
      </div>
    );
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
