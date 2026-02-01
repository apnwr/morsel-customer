'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Login page - now acts as a redirect guard.
 *
 * The login form has been moved to a modal on the /space/[spaceId] page
 * to prevent the back button issue where pressing back would show the
 * login page again and create duplicate participants.
 *
 * This page now handles edge cases:
 * 1. If user has active session → redirect to /menu
 * 2. If user has no session → redirect to / (home) to scan QR
 */
export default function LoginPage() {
  const router = useRouter();
  const { sessionData, previewSession } = useSession();

  useEffect(() => {
    // Check if user already has an active session
    const existingUserId = localStorage.getItem('morsel_session_user_id');

    if (existingUserId && sessionData?.session?.status === 'active') {
      // User has active session, redirect to menu
      console.log('[LoginPage] User has active session, redirecting to menu');
      router.replace('/menu');
      return;
    }

    // If user has a preview session (came from /space), this is unexpected
    // since login is now handled by modal. Redirect back to space page.
    if (previewSession?.space?.id) {
      console.log('[LoginPage] Has preview session, redirecting to space page');
      router.replace(`/space/${previewSession.space.id}`);
      return;
    }

    // No session at all, redirect to home to scan QR code
    console.log('[LoginPage] No session, redirecting to home');
    router.replace('/');
  }, [router, sessionData, previewSession]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center flex flex-col items-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
