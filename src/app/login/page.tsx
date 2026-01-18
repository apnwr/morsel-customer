'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/Button';
import { setInStorage } from '@/mocks/mockStorage';
import { validateCustomerName, sanitizeCustomerName } from '@/lib/validation';
import { sessionService } from '@/services/session.service';

type DiningType = 'dine-in' | 'takeaway' | 'delivery';

export default function LoginPage() {
  const router = useRouter();
  const { context, setContext } = useRestaurant();
  const { previewSession, setSessionData } = useSession();
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
      console.log('[LoginPage] 🚀 Starting session join process...');

      // Validate we have preview session from QR scan
      if (!previewSession?.space?.id) {
        throw new Error('No session preview available. Please scan the QR code again.');
      }

      console.log('[LoginPage] 📡 Calling /ordering-session/start API...');
      console.log('[LoginPage] Request:', {
        spaceId: previewSession.space.id,
        guestName: sanitizedName,
        existingSession: previewSession.session ? 'Will JOIN existing' : 'Will CREATE new',
      });

      // Call /start endpoint - this is smart and will:
      // 1. Join existing active session for this space (if exists)
      // 2. OR create a NEW session if no active session exists
      // This is perfect for restaurant use case:
      //    - First customer at table → Creates session
      //    - Additional customers → Join existing session
      const sessionResponse = await sessionService.startSession({
        spaceId: previewSession.space.id,
        guestName: sanitizedName,
      });

      console.log('[LoginPage] ✅ Session API response:', {
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

      console.log('[LoginPage] ✅ Found current user in participants:', {
        sessionUserId: currentUser.sessionUserId,
        guestName: currentUser.guestName,
      });

      // ✅ NOW save everything to localStorage (user is confirmed participant)
      console.log('[LoginPage] 💾 Saving session data to localStorage...');

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

      // Set restaurant context from API data (replaces mock data)
      console.log('[LoginPage] 🏪 Setting restaurant context from API data');
      setContext({
        restaurant: {
          id: previewSession.business.id,
          name: previewSession.business.businessName,
          themeColor: '#E68E2E', // Default theme color (API doesn't provide this yet)
          logo: '', // API doesn't provide logo yet
          branches: [{
            id: previewSession.space.id,
            name: previewSession.space.name,
            tables: 50, // Default, not critical for functionality
          }],
        },
        branch: {
          id: previewSession.space.id,
          name: previewSession.space.name,
          tables: 50,
        },
        table: 1, // Not critical since we use space.name for display
      });

      console.log('[LoginPage] ✅ Session joined successfully!');
      console.log('[LoginPage] 🎉 User is now a participant in session:', sessionResponse.data.id);

      // Navigate to menu page
      router.push('/menu');
    } catch (error) {
      console.error('[LoginPage] ❌ Failed to join session:', error);

      // Show error to user - do NOT continue without valid session
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
    <div className="min-h-screen bg-white p-6 flex flex-col">
      {/* Restaurant Logo */}
      <div className="flex justify-center mb-8 mt-8">
        <div
          className=" h-32 rounded-2xl shadow-sm flex items-center justify-center text-2xl font-bold text-white px-4 text-center"
          style={{ backgroundColor: context?.restaurant.themeColor || '#E68E2E' }}
        >
          {previewSession?.business.businessName || context?.restaurant.name || 'morsel'}
        </div>
      </div>

      {/* Table Number and Name Input */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-2 text-gray-700">
          {previewSession?.space.name || (context?.table ? `Table ${context.table}` : 'Welcome')}
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
          maxLength={50}
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
        <button
          onClick={() => setDiningType('delivery')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            diningType === 'delivery'
              ? 'bg-black text-white'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Delivery
        </button>
      </div>

      {/* Authentication Buttons */}
      <div className="space-y-3 flex-1 flex flex-col justify-end mb-2">
        <Button
          variant="primary"
          fullWidth
          onClick={() => handleSubmit('guest')}
          disabled={isStarting}
        >
          {isStarting ? 'Starting Session...' : 'Continue as Guest'}
        </Button>
      </div>
    </div>
  );
}
