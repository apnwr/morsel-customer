'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { modalVariants, backdropVariants } from '@/lib/animations';
import { setInStorage } from '@/mocks/mockStorage';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { validateCustomerName, sanitizeCustomerName } from '@/lib/validation';
import { sessionService } from '@/services/session.service';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useSession } from '@/contexts/SessionContext';
import type { OrderingSessionData } from '@/types/api/session';

function hasValidLogo(logo: string | undefined | null): logo is string {
  return typeof logo === 'string' && logo.trim().length > 0;
}

interface AreaLoginModalProps {
  isOpen: boolean;
  areaId: string;
  previewSession: OrderingSessionData | null;
}

export function AreaLoginModal({ isOpen, areaId, previewSession }: AreaLoginModalProps) {
  const router = useRouter();
  const { setContext } = useRestaurant();
  const { setSessionData } = useSession();
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const handleSubmit = async () => {
    const validation = validateCustomerName(customerName);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid name');
      return;
    }

    const sanitizedName = sanitizeCustomerName(customerName);
    setIsStarting(true);
    setError('');

    try {
      if (!areaId) {
        throw new Error('No area ID available. Please scan the QR code again.');
      }

      // Start area session (no items — just create session)
      // Response: { data: { session: {...}, order: {...} } }
      const response = await sessionService.startAreaSession({
        areaId,
        guestName: sanitizedName,
        businessId: previewSession?.business?.id,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resData = response.data as any;
      const session = resData.session || resData;
      const participants = session.participants || [];

      // Extract sessionUserId from participants
      const currentUser = participants.find(
        (p: { guestName: string }) => p.guestName === sanitizedName
      );

      if (!currentUser) {
        throw new Error('Failed to join session - participant not found in response');
      }

      // Save flow type as area
      setInStorage(STORAGE_KEYS.FLOW_TYPE, 'area');
      setInStorage(STORAGE_KEYS.AREA_ID, areaId);
      setInStorage(STORAGE_KEYS.CUSTOMER_NAME, sanitizedName);
      setInStorage(STORAGE_KEYS.AUTH_METHOD, 'guest');
      setInStorage(STORAGE_KEYS.SESSION_USER_ID, currentUser.sessionUserId);

      // Update active session in context — map area response to session shape
      setSessionData({
        space: previewSession?.space || { id: '', name: session.areaName || 'Counter' } as any,
        business: previewSession?.business || { id: session.businessId, businessName: '' } as any,
        session: {
          id: session.id,
          spaceId: session.spaceId || '',
          businessId: session.businessId,
          status: session.status,
          participants,
          orders: (session.orders || []).map((o: any) => typeof o === 'string' ? o : o.orderId),
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        },
        participantsCount: 1,
      });

      // Set restaurant context from session response
      setContext({
        restaurant: {
          id: session.businessId,
          name: previewSession?.business?.businessName || '',
          themeColor: '#E68E2E',
          logo: previewSession?.business?.logo || '',
          branches: [{
            id: session.branchId || areaId,
            name: session.branchName || session.areaName || 'Counter',
            tables: 1,
          }],
        },
        branch: {
          id: session.branchId || areaId,
          name: session.branchName || session.areaName || 'Counter',
          tables: 1,
        },
        table: 1,
      });

      router.replace('/menu');
    } catch (err) {
      console.error('[AreaLoginModal] Failed to start area session:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not start ordering. Please try again.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  const businessName = previewSession?.business?.businessName || 'morsel';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <motion.div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          <motion.div
            className="relative w-full bg-white rounded-t-[20px] shadow-xl max-h-[85vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="area-login-title"
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
                {hasValidLogo(previewSession?.business?.logo) ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm bg-gray-100">
                    <Image
                      src={previewSession.business.logo}
                      alt={`${businessName} logo`}
                      fill
                      className="object-contain"
                      sizes="80px"
                      unoptimized
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="h-16 rounded-xl shadow-sm flex items-center justify-center text-xl font-bold text-white px-6 text-center"
                    style={{ backgroundColor: '#000000' }}
                  >
                    {businessName}
                  </div>
                )}
              </div>

              {/* Name Input */}
              <div className="mb-6">
                <div className="text-sm font-semibold mb-2 text-gray-700">
                  Quick order
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

              {/* Start Button */}
              <div className="pb-4">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={isStarting}
                  loading={isStarting}
                >
                  {isStarting ? 'Starting...' : 'Start Ordering'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
