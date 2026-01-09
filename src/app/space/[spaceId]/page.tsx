'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sessionService } from '@/services/session.service';
import { useSession } from '@/contexts/SessionContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const { setPreviewSession } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const spaceId = params.spaceId as string;

        if (!spaceId) {
          setError('Invalid space ID');
          return;
        }

        console.log('[SpacePage] 📡 Fetching session for spaceId:', spaceId);

        // Fetch ordering session data (preview only, not persisted yet)
        const response = await sessionService.getSessionBySpaceId(spaceId);

        console.log('[SpacePage] ✅ Space/Session info fetched:', {
          businessName: response.data.business?.businessName,
          spaceName: response.data.space?.name,
          hasActiveSession: !!response.data.session,
          sessionStatus: response.data.session?.status || 'No session yet',
          participantsCount: response.data.participantsCount || 0,
        });

        // Validate space and business (NOT session - session can be created later!)
        if (!response.data.space) {
          setError('Invalid space. Please check the QR code.');
          return;
        }

        if (!response.data.business) {
          setError('Business information not found. Please contact the restaurant staff.');
          return;
        }

        // Check if there's an existing session and it's not active
        // (Only block if session exists but is closed/ended)
        if (response.data.session && response.data.session.status !== 'active') {
          setError(`The ordering session for this table is ${response.data.session.status}. Please contact the restaurant staff or scan again.`);
          return;
        }

        // Store as PREVIEW session only (ephemeral, not saved to localStorage)
        // If no session exists yet, that's OK - user will create one when they login!
        // If session exists and is active, user will join it when they login!
        console.log('[SpacePage] 👁️ Setting preview session (NOT saved to localStorage yet)');
        if (response.data.session) {
          console.log('[SpacePage] ℹ️ Active session exists - user will JOIN it');
        } else {
          console.log('[SpacePage] ℹ️ No active session - user will CREATE one');
        }
        setPreviewSession(response.data);

        // Redirect to login page
        router.push('/login');
      } catch (err) {
        console.error('[SpacePage] ❌ Error fetching session data:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load session data. Please try scanning the QR code again.'
        );
      }
    };

    fetchSessionData();
  }, [params.spaceId, router, setPreviewSession]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
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

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading your session...</p>
      </div>
    </div>
  );
}
