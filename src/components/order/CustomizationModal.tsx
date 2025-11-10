'use client';

import React, { useState, useMemo } from 'react';
import { MenuItem } from '@/types/menu';
import { Customization } from '@/types/cart';
import { Modal } from '@/components/ui/Modal';
import Image from 'next/image';

interface CustomizationModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customizations: Customization[], quantity: number) => void;
}

export function CustomizationModal({ 
  item, 
  isOpen, 
  onClose, 
  onAddToCart 
}: CustomizationModalProps) {
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  // Calculate total price based on selections
  const totalPrice = useMemo(() => {
    let price = item.price;
    
    // Add price modifiers from selected choices
    if (item.customOptions) {
      item.customOptions.forEach((option) => {
        const selectedChoiceId = selectedChoices[option.id];
        if (selectedChoiceId) {
          const choice = option.choices.find((c) => c.id === selectedChoiceId);
          if (choice) {
            price += choice.priceModifier;
          }
        }
      });
    }
    
    return price * quantity;
  }, [item, selectedChoices, quantity]);

  const handleChoiceSelect = (optionId: string, choiceId: string) => {
    setSelectedChoices((prev) => ({
      ...prev,
      [optionId]: choiceId,
    }));
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(99, quantity + delta));
    setQuantity(newQuantity);
  };

  const handleContinue = () => {
    // Build customizations array
    const customizations: Customization[] = [];
    
    if (item.customOptions) {
      item.customOptions.forEach((option) => {
        const selectedChoiceId = selectedChoices[option.id];
        if (selectedChoiceId) {
          const choice = option.choices.find((c) => c.id === selectedChoiceId);
          if (choice) {
            customizations.push({
              optionId: option.id,
              optionName: option.name,
              choiceId: choice.id,
              choiceLabel: choice.label,
              priceModifier: choice.priceModifier,
            });
          }
        }
      });
    }
    
    onAddToCart(customizations, quantity);
    onClose();
    
    // Reset state
    setSelectedChoices({});
    setQuantity(1);
  };

  // Check if all required options are selected
  const canContinue = useMemo(() => {
    if (!item.customOptions) return true;
    
    return item.customOptions.every((option) => {
      if (option.required) {
        return selectedChoices[option.id] !== undefined;
      }
      return true;
    });
  }, [item.customOptions, selectedChoices]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" showCloseButton={false}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 shrink-0">
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="rounded-full object-cover"
              sizes="64px"
            />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{item.name}</h2>
            <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Customization Options */}
      <div className="p-6">
        {item.customOptions?.map((option) => (
          <div key={option.id} className="mb-6">
            <h3 className="font-semibold mb-3">
              {option.name}
              {option.required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            <div className="space-y-2">
              {option.choices.map((choice) => {
                const isSelected = selectedChoices[option.id] === choice.id;
                
                return (
                  <button
                    key={choice.id}
                    onClick={() => handleChoiceSelect(option.id, choice.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-black text-white'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span>{choice.label}</span>
                    <span>
                      ${(item.price + choice.priceModifier).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quantity Selector */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Quantity</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
              className="w-10 h-10 border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              −
            </button>
            <span className="text-lg font-medium w-8 text-center">{quantity}</span>
            <button
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= 99}
              className="w-10 h-10 border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="p-6 border-t border-gray-100">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full py-4 bg-black text-white rounded-xl font-medium hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue • ${totalPrice.toFixed(2)}
        </button>
      </div>
    </Modal>
  );
}
