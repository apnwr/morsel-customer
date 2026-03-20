'use client';

import React, { useState, useMemo } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { CartItem as CartItemType } from '@/types/cart';
import { OrderingSessionData } from '@/types/api/session';
import { Minus } from 'lucide-react';
import Image from 'next/image';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onCustomize?: (item: CartItemType) => void;
  sessionData?: OrderingSessionData | null;
}

export const CartItem = React.memo(function CartItem({ item, onUpdateQuantity, sessionData }: CartItemProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { formatPrice } = useLocale();

  // Check for vegetarian/non-vegetarian status from allergens or dietary arrays
  const getDietaryType = useMemo(() => {
    const allDietaryInfo = [
      ...(item.menuItem.allergens || []),
      ...(item.menuItem.dietary || [])
    ].map(d => d.toLowerCase());
    
    if (allDietaryInfo.some(d => d === 'non-vegetarian' || d === 'non vegetarian' || d === 'nonvegetarian')) {
      return 'non-vegetarian';
    }
    if (allDietaryInfo.some(d => d === 'vegetarian' || d === 'veg')) {
      return 'vegetarian';
    }
    return null;
  }, [item.menuItem.allergens, item.menuItem.dietary]);

  // Get participant name from sessionUserId
  const getParticipantName = (): string | null => {
    if (!item.sessionUserId || !sessionData?.session?.participants) {
      return null;
    }

    const participant = sessionData.session.participants.find(
      (p) => p.sessionUserId === item.sessionUserId
    );

    return participant ? participant.guestName : null;
  };

  const participantName = getParticipantName();

  const handleDecrement = () => {
    const newQuantity = item.quantity - 1;
    if (newQuantity === 0) {
      // Show confirmation modal
      setShowDeleteModal(true);
    } else if (newQuantity >= 1) {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  const handleConfirmDelete = () => {
    onUpdateQuantity(item.id, 0);
  };

  const handleIncrement = () => {
    const newQuantity = item.quantity + 1;
    if (newQuantity <= 99) {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  return (
    <article 
      className="flex items-start justify-between gap-4 md:gap-20 py-3"
      aria-label={`${item.menuItem.name}, quantity ${item.quantity}, total ${formatPrice(item.itemTotal)}`}
    >
      {/* Left Section - Item Details */}
      <div className="flex flex-col gap-2 w-full md:w-[178px] flex-1 min-w-0">
        {/* Item Info Row */}
        <div className="flex items-center gap-[5px]">
          {/* Item Image */}
          <div className="shrink-0 w-[47px] h-[47px] rounded-[12px] overflow-hidden bg-gray-100">
            {item.menuItem.image ? (
              <Image
                src={item.menuItem.image}
                alt={item.menuItem.name}
                width={47}
                height={47}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-[10px] text-gray-400 text-center">No<br/> image</span>
              </div>
            )}
          </div>

          {/* Participant Name Badge */}
          {participantName && (
            <div className="shrink-0">
              <span
                className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full whitespace-nowrap"
                style={{ fontFamily: 'Lato, sans-serif', fontSize: '10px' }}
                title={`Ordered by ${participantName}`}
              >
                {participantName}
              </span>
            </div>
          )}

          {/* Text Info */}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {/* Vegetarian/Non-Vegetarian Symbol */}
            {getDietaryType && (
              <div 
                className={`w-3.5 h-3.5 flex items-center justify-center rounded-[2px] border-[1.5px] bg-white ${
                  getDietaryType === 'vegetarian' 
                    ? 'border-green-600' 
                    : 'border-red-600'
                }`}
                aria-label={getDietaryType === 'vegetarian' ? 'Vegetarian' : 'Non-vegetarian'}
                title={getDietaryType === 'vegetarian' ? 'Vegetarian' : 'Non-vegetarian'}
              >
                {getDietaryType === 'vegetarian' ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                ) : (
                  <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[5px] border-l-transparent border-r-transparent border-b-red-600" />
                )}
              </div>
            )}
            <h3
              className="font-bold text-sm leading-[1.2] truncate"
              style={{ fontFamily: 'Lato, sans-serif' }}
            >
              {item.menuItem.name}
            </h3>
            <p 
              className="text-sm leading-[1.22] opacity-50"
              style={{ fontFamily: 'Helvetica Neue, sans-serif', fontWeight: 500 }}
              aria-label={`Unit price: ${formatPrice(item.menuItem.price)}`}
            >
              {formatPrice(item.menuItem.price)}
            </p>
          </div>
        </div>

        {/* Customize Button */}
        {/* {item.menuItem.isCustomizable && onCustomize && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCustomize(item)}
              className="flex items-center gap-2 px-[10px] py-[7px] border-2 border-black rounded-[12px] hover:bg-gray-50 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              style={{ fontFamily: 'Lato, sans-serif', fontWeight: 700, fontSize: '12px', lineHeight: '1.2' }}
              aria-label={`Customize ${item.menuItem.name}`}
            >
              <span>Customize</span>
              <Image
                src="/icons/Plus.png"
                alt="counter-add-icon"
                width={14}
                height={14}
                className="object-contain"
                
              />
            </button>
          </div>
        )} */}
      </div>

      {/* Right Section - Quantity Controls & Total */}
      <div className="flex flex-col items-end gap-2 w-auto md:w-[106px] shrink-0">
        {/* Quantity Controls */}
        <div 
          className="flex items-center gap-4 px-[10px] py-2 border-2 border-black rounded-[12px] bg-white"
          role="group" 
          aria-label={`Quantity controls for ${item.menuItem.name}`}
        >
          
           <button
            onClick={handleDecrement}
            className="w-5 h-5 flex items-center justify-center hover:opacity-70 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label={`Decrease quantity of ${item.menuItem.name}`}
          >
            <Minus className="w-5 h-5" />
          </button>
          <span 
            className="text-xl font-bold min-w-[14px] text-center"
            style={{ fontFamily: 'Lato, sans-serif', fontWeight: 700, lineHeight: '1.2' }}
            aria-label={`Quantity: ${item.quantity}`}
            role="status"
          >
            {item.quantity}
          </span>
         <button
            onClick={handleIncrement}
            disabled={item.quantity >= 99}
            className="w-5 h-5 flex items-center justify-center hover:opacity-70 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Increase quantity of ${item.menuItem.name}`}
          >
            <Image
              src="/icons/Plus.png"
              alt="Increase quantity"
              width={20}
              height={20}
              className="object-contain"
            />
          </button>
        </div>

        {/* Item Total */}
        <div 
          className="font-black text-xs leading-[1.2]"
          style={{ fontFamily: 'Lato, sans-serif', fontWeight: 900 }}
          aria-label={`Item total: ${formatPrice(item.itemTotal)}`}
        >
          {formatPrice(item.itemTotal)}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        itemName={item.menuItem.name}
      />
    </article>
  );
});
