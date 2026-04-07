'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/contexts/SessionContext';
import { useCart } from '@/contexts/CartContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AreaLoginModal } from '@/components/session/AreaLoginModal';
import { getFromStorage } from '@/mocks/mockStorage';
import type { OrderingSessionData } from '@/types/api/session';

export default function AreaPage() {
  const params = useParams();
  const router = useRouter();
  const { sessionData, endSession } = useSession();
  const { clearCart } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const areaId = params.areaId as string;

  useEffect(() => {
    const init = async () => {
      // Check if user already has an active area session for THIS area
      const existingUserId = getFromStorage<string>('morsel_session_user_id');
      const existingFlowType = getFromStorage<string>('morsel_flow_type');
      const existingAreaId = getFromStorage<string>('morsel_area_id');
      const existingSession = sessionData?.session;

      if (existingUserId && existingSession?.status === 'active'
        && existingFlowType === 'area' && existingAreaId === areaId) {
        // Same area — resume existing session
        console.log('[AreaPage] Active area session exists, redirecting to menu');
        router.replace('/menu');
        return;
      }

      // Any other case — different area, space flow, or stale session. Clean everything.
      if (existingUserId && existingSession?.status === 'active') {
        console.log('[AreaPage] Different session detected, ending previous');
        try {
          await endSession('left');
        } catch (e) {
          console.error('[AreaPage] Failed to end previous session:', e);
        }
      }

      // Clear ALL stale data — ensures no space flow leakage
      clearCart();
      localStorage.removeItem('morsel_session_data');
      localStorage.removeItem('morsel_session_user_id');
      localStorage.removeItem('morsel_active_order_id');
      localStorage.removeItem('morsel_split');
      localStorage.removeItem('morsel_itemized_selections');
      localStorage.removeItem('morsel_kitchen_note');
      localStorage.removeItem('morsel_tip');
      localStorage.removeItem('morsel_flow_type');
      localStorage.removeItem('morsel_area_id');
      localStorage.removeItem('morsel_restaurant_context');

      if (!areaId) {
        setError('Invalid area ID');
        setIsLoading(false);
        return;
      }

      // Area flow doesn't have a preview API — go straight to login
      setIsLoading(false);
      setShowLoginModal(true);
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId]);

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
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div
          className="h-20 rounded-xl shadow-lg flex items-center justify-center text-2xl font-bold text-white px-8 mb-6"
          style={{ backgroundColor: '#000000' }}
        >
          morsel
        </div>
        <p className="text-gray-400 text-sm">Enter your name to start ordering</p>
      </div>

      <AreaLoginModal
        isOpen={showLoginModal}
        areaId={areaId}
        previewSession={sessionData as OrderingSessionData | null}
      />
    </div>
  );
}
