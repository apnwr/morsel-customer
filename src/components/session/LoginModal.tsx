'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { modalVariants, backdropVariants } from '@/lib/animations';
import { setInStorage } from '@/mocks/mockStorage';
import { validateCustomerName, sanitizeCustomerName } from '@/lib/validation';
import { sessionService } from '@/services/session.service';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useSession } from '@/contexts/SessionContext';
import type { OrderingSessionData } from '@/types/api/session';

type DiningType = 'dine-in' | 'takeaway';

interface LoginModalProps {
  isOpen: boolean;
  previewSession: OrderingSessionData | null;
}

export function LoginModal({ isOpen, previewSession }: LoginModalProps) {
  const router = useRouter();
  const { setContext } = useRestaurant();
  const { setSessionData } = useSession();
  const [customerName, setCustomerName] = useState('');
  const [diningType, setDiningType] = useState<DiningType>('dine-in');
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const handleSubmit = async (authMethod: 'guest' | 'google' | 'apple') => {
    // Validate name input
    const validation = validateCustomerName(customerName);

    if (!validation.isValid) {
      setError(validation.error || 'Invalid name');
      return;
    }

    // Sanitize the name
    const sanitizedName = sanitizeCustomerName(customerName);

    setIsStarting(true);
    setError('');

    try {
      console.log('[LoginModal] Starting session join process...');

      // Validate we have preview session from QR scan
      if (!previewSession?.space?.id) {
        throw new Error('No session preview available. Please scan the QR code again.');
      }

      console.log('[LoginModal] Calling /ordering-session/start API...');
      console.log('[LoginModal] Request:', {
        spaceId: previewSession.space.id,
        guestName: sanitizedName,
        existingSession: previewSession.session ? 'Will JOIN existing' : 'Will CREATE new',
      });

      // Call /start endpoint - this is smart and will:
      // 1. Join existing active session for this space (if exists)
      // 2. OR create a NEW session if no active session exists
      const sessionResponse = await sessionService.startSession({
        spaceId: previewSession.space.id,
        guestName: sanitizedName,
      });

      console.log('[LoginModal] Session API response:', {
        sessionId: sessionResponse.data.id,
        status: sessionResponse.data.status,
        participantsCount: sessionResponse.data.participants.length,
      });

      // Extract sessionUserId from the participant entry
      const currentUser = sessionResponse.data.participants.find(
        (p) => p.guestName === sanitizedName
      );

      if (!currentUser) {
        throw new Error('Failed to join session - participant not found in response');
      }

      console.log('[LoginModal] Found current user in participants:', {
        sessionUserId: currentUser.sessionUserId,
        guestName: currentUser.guestName,
      });

      // Save everything to localStorage (user is confirmed participant)
      console.log('[LoginModal] Saving session data to localStorage...');

      // Store customer information
      setInStorage('morsel_customer_name', sanitizedName);
      setInStorage('morsel_dining_type', diningType);
      setInStorage('morsel_auth_method', authMethod);

      // Store the API-provided sessionUserId (CRITICAL for cart sync)
      setInStorage('morsel_session_user_id', currentUser.sessionUserId);

      // Update active session in context (this also saves to localStorage)
      setSessionData({
        ...previewSession,
        session: sessionResponse.data,
        participantsCount: sessionResponse.data.participants.length,
      });

      // Set restaurant context from API data
      console.log('[LoginModal] Setting restaurant context from API data');
      setContext({
        restaurant: {
          id: previewSession.business.id,
          name: previewSession.business.businessName,
          themeColor: '#E68E2E',
          logo: '',
          branches: [{
            id: previewSession.space.id,
            name: previewSession.space.name,
            tables: 50,
          }],
        },
        branch: {
          id: previewSession.space.id,
          name: previewSession.space.name,
          tables: 50,
        },
        table: 1,
      });

      console.log('[LoginModal] Session joined successfully!');

      // Navigate to menu page using replace to prevent back button issues
      router.replace('/menu');
    } catch (error) {
      console.error('[LoginModal] Failed to join session:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'Could not join the ordering session. Please try again.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop - no onClick to prevent closing */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          {/* Modal content - bottom sheet style */}
          <motion.div
            className="relative w-full bg-white rounded-t-[20px] shadow-xl max-h-[85vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="p-6">
              {/* Drag indicator */}
              <div className="flex justify-center mb-4">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Restaurant Logo/Name */}
              <div className="flex justify-center mb-6">
                <div
                  className="h-16 rounded-xl shadow-sm flex items-center justify-center text-xl font-bold text-white px-6 text-center"
                  style={{ backgroundColor: '#000000' }}
                >
                  {previewSession?.business?.businessName || 'morsel'}
                </div>
              </div>

              {/* Space/Table Name and Name Input */}
              <div className="mb-6">
                <div className="text-sm font-semibold mb-2 text-gray-700">
                  {previewSession?.space?.name || 'Welcome'}
                </div>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setError('');
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength={60}
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-red-500 mt-2">{error}</p>
                )}
              </div>

              {/* Dining Type Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setDiningType('dine-in')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    diningType === 'dine-in'
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  Dine-in
                </button>
                <button
                  onClick={() => setDiningType('takeaway')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    diningType === 'takeaway'
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  Take-Away
                </button>
              </div>

              {/* Authentication Button */}
              <div className="pb-4">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => handleSubmit('guest')}
                  disabled={isStarting}
                  loading={isStarting}
                >
                  {isStarting ? 'Starting Session...' : 'Continue as Guest'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
