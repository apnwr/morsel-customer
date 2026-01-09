'use client';

import React, { useState } from 'react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useCart } from '@/contexts/CartContext';
import { useOrder } from '@/contexts/OrderContext';
import { useSplit } from '@/contexts/SplitContext';
import { useRouter } from 'next/navigation';
import { restaurants } from '@/mocks/restaurants';
import { getMenuForRestaurant } from '@/mocks/menuData';

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [displayTableNumber, setDisplayTableNumber] = useState('15');
  const router = useRouter();

  const { context, switchRestaurant, switchBranch, changeTable } = useRestaurant();
  const { addItem } = useCart();
  const { startTimer, expireTimer, resetOrder } = useOrder();
  const { addMockParticipant } = useSplit();

  // Load display table number on mount
  React.useEffect(() => {
    const stored = localStorage.getItem('morsel_table_number');
    if (stored) {
      setDisplayTableNumber(stored);
    }
  }, []);

  // Check visibility based on environment and localStorage
  const isVisible = (() => {
    if (typeof window === 'undefined') return false;
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isEnabled = localStorage.getItem('enableDebugPanel') === 'true';
    return isDevelopment || isEnabled;
  })();

  if (!isVisible || !context) {
    return null;
  }

  const handleSwitchRestaurant = () => {
    if (!context) return;
    const currentIndex = restaurants.findIndex((r) => r.id === context.restaurant.id);
    const nextIndex = (currentIndex + 1) % restaurants.length;
    const nextRestaurant = restaurants[nextIndex];
    switchRestaurant(nextRestaurant.id);
  };

  const handleSwitchBranch = () => {
    if (!context) return;
    const currentIndex = context.restaurant.branches.findIndex(
      (b) => b.id === context.branch.id
    );
    const nextIndex = (currentIndex + 1) % context.restaurant.branches.length;
    const nextBranch = context.restaurant.branches[nextIndex];
    switchBranch(nextBranch.id);
  };

  const handleChangeTable = () => {
    if (!context) return;
    const randomTable = Math.floor(Math.random() * context.branch.tables) + 1;
    changeTable(randomTable);
  };

  const handleAddRandomItem = () => {
    if (!context) return;
    const menu = getMenuForRestaurant(context.restaurant.id);
    if (menu.items.length > 0) {
      const randomIndex = Math.floor(Math.random() * menu.items.length);
      const randomItem = menu.items[randomIndex];
      addItem(randomItem);
    }
  };

  const handleClearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      const confirmClear = window.confirm(
        'Are you sure you want to clear all localStorage? This will reset the entire app state.'
      );
      if (confirmClear) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 active:scale-95 transition-all z-50 flex items-center justify-center"
        aria-label="Toggle Debug Panel"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2" />
        </svg>
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center sm:justify-end">
          <div
            className="bg-white w-full sm:w-96 max-h-[70vh] sm:max-h-screen overflow-y-auto shadow-xl animate-slide-up sm:animate-slide-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Debug Panel</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close Debug Panel"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6 overflow-y-auto flex-1">
              {/* Current Context */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Context</h3>
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <div>
                    <span className="text-gray-600">Restaurant:</span>{' '}
                    <span className="font-medium">{context.restaurant.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Area:</span>{' '}
                    <span className="font-medium">{context.branch.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Table:</span>{' '}
                    <span className="font-medium">{displayTableNumber}</span>
                  </div>
                </div>
              </div>

              {/* Restaurant Controls */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Restaurant & Area Controls</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleSwitchRestaurant}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Switch Restaurant
                  </button>
                  <button
                    onClick={handleSwitchBranch}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Switch Area
                  </button>
                  <button
                    onClick={handleChangeTable}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Change Table
                  </button>
                  
                  {/* Table Number Input */}
                  <div className="mt-3">
                    <label className="block text-xs text-gray-600 mb-1">Set Table Number (for display)</label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={displayTableNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDisplayTableNumber(value);
                        localStorage.setItem('morsel_table_number', value);
                        window.dispatchEvent(new Event('storage'));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter table number"
                    />
                  </div>
                </div>
              </div>

              {/* Cart & Order Controls */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Cart & Order Controls</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleAddRandomItem}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Add Random Item
                  </button>
                  <button
                    onClick={addMockParticipant}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Add Mock Person
                  </button>
                  <button
                    onClick={startTimer}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Simulate Order Placed
                  </button>
                  <button
                    onClick={expireTimer}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Expire Timer
                  </button>
                  <button
                    onClick={resetOrder}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Reset Order
                  </button>
                </div>
              </div>

              {/* State Management Controls */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">State Management</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleClearLocalStorage}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Clear LocalStorage
                  </button>
                </div>
              </div>

              {/* Quick Navigation */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Navigation</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      router.push('/login');
                      setIsOpen(false);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      router.push('/menu');
                      setIsOpen(false);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Menu
                  </button>
                  <button
                    onClick={() => {
                      router.push('/cart');
                      setIsOpen(false);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Cart
                  </button>
                  <button
                    onClick={() => {
                      router.push('/order-summary');
                      setIsOpen(false);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 active:scale-95 transition-all text-sm font-medium"
                  >
                    Order Summary
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
