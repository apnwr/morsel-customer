'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sessionService } from '@/services/session.service';
import { useSession } from '@/contexts/SessionContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function SpacePage() {
  const params = useParams();
  const router = useRouter();
  const { setSessionData } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const spaceId = params.spaceId as string;

        if (!spaceId) {
          setError('Invalid space ID');
          return;
        }

        // Fetch ordering session data
        const response = await sessionService.getSessionBySpaceId(spaceId);

        // Store session data in context
        setSessionData(response.data);

        // Redirect to login page
        router.push('/login');
      } catch (err) {
        console.error('Error fetching session data:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load session data. Please try scanning the QR code again.'
        );
      }
    };

    fetchSessionData();
  }, [params.spaceId, router, setSessionData]);

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
