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
  const { context } = useRestaurant();
  const { sessionData, setSessionData } = useSession();
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
      // Store customer information in localStorage
      setInStorage('morsel_customer_name', sanitizedName);
      setInStorage('morsel_dining_type', diningType);
      setInStorage('morsel_auth_method', authMethod);

      // Start ordering session if we have sessionData
      if (sessionData?.space?.id) {
        const sessionResponse = await sessionService.startSession({
          spaceId: sessionData.space.id,
          guestName: sanitizedName,
        });

        // ✅ Extract and store the sessionUserId from API response
        const currentUser = sessionResponse.data.participants.find(
          (p) => p.guestName === sanitizedName
        );

        if (currentUser) {
          // Store the API-provided sessionUserId
          setInStorage('morsel_session_user_id', currentUser.sessionUserId);
          console.log('Stored sessionUserId:', currentUser.sessionUserId);
        } else {
          console.warn('Current user not found in participants');
        }

        // Update session data with active session
        setSessionData({
          ...sessionData,
          session: sessionResponse.data,
        });

        console.log('Session started:', sessionResponse.data.id);
      } else {
        console.warn('No space data available, skipping session start');
      }

      // Navigate to menu page
      router.push('/menu');
    } catch (error) {
      console.error('Failed to start session:', error);
      // Don't block user - continue to menu even if session start fails
      // The app will work offline, queue sync will be skipped
      setError('Could not start session. Continuing in offline mode.');

      // Still navigate after showing error briefly
      setTimeout(() => {
        router.push('/menu');
      }, 1500);
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
          style={{ backgroundColor: context.restaurant.themeColor }}
        >
          {sessionData?.business.businessName || context.restaurant.name}
        </div>
      </div>

      {/* Table Number and Name Input */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-2 text-gray-700">
          {sessionData?.space.name || `Table ${context.table}`}
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
      <div className="space-y-3 flex-1 flex flex-col justify-end">
        <Button
          variant="primary"
          fullWidth
          onClick={() => handleSubmit('guest')}
          disabled={isStarting}
        >
          {isStarting ? 'Starting Session...' : 'Continue as Guest'}
        </Button>
        
        <Button
          variant="secondary"
          fullWidth
          onClick={() => handleSubmit('google')}
          disabled={isStarting}
        >
          <span className="flex items-center justify-center gap-2">
            {!isStarting && (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {isStarting ? 'Starting Session...' : 'Continue with Google'}
          </span>
        </Button>

        <Button
          variant="secondary"
          fullWidth
          onClick={() => handleSubmit('apple')}
          disabled={isStarting}
        >
          <span className="flex items-center justify-center gap-2">
            {!isStarting && (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            )}
            {isStarting ? 'Starting Session...' : 'Continue with Apple'}
          </span>
        </Button>
      </div>
    </div>
  );
}
