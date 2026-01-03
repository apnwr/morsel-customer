'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MenuItem } from '@/types/menu';
import { Customization } from '@/types/cart';
import { Modal } from '@/components/ui/Modal';
import Image from 'next/image';
import { X, Clock } from 'lucide-react';

interface CustomizationModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customizations: Customization[], quantity: number) => void;
  existingQuantityInCart?: number;
  lastCustomizations?: Customization[];
}

export function CustomizationModal({
  item,
  isOpen,
  onClose,
  onAddToCart,
  existingQuantityInCart = 0,
  lastCustomizations
}: CustomizationModalProps) {
  // For radio options: optionId -> choiceId
  // For checkbox options: optionId -> choiceId[] (multiple selections)
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string | string[]>>({});
  const [quantity, setQuantity] = useState(1);

  // Initialize state when modal opens or when lastCustomizations change
  useEffect(() => {
    if (isOpen) {
      // Helper function to convert Customization[] to selected choices format
      const convertCustomizationsToSelections = (
        customizations: Customization[],
        customOptions?: typeof item.customOptions
      ): Record<string, string | string[]> => {
        if (!customOptions || !customizations.length) return {};

        const selections: Record<string, string | string[]> = {};

        customOptions.forEach((option) => {
          const matchingCustomizations = customizations.filter(
            (c) => c.optionId === option.id
          );

          if (option.type === 'radio' && matchingCustomizations.length > 0) {
            // For radio, take the first matching choice
            selections[option.id] = matchingCustomizations[0].choiceId;
          } else if (option.type === 'checkbox' && matchingCustomizations.length > 0) {
            // For checkbox, collect all matching choices
            selections[option.id] = matchingCustomizations.map((c) => c.choiceId);
          }
        });

        return selections;
      };

      // Pre-fill with last customizations if available
      const initialSelections = convertCustomizationsToSelections(
        lastCustomizations || [],
        item.customOptions
      );

      // Use setTimeout to avoid cascading renders
      const timer = setTimeout(() => {
        setSelectedChoices(initialSelections);
        setQuantity(1);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [isOpen, lastCustomizations, item]);

  // Helper function to get initials from item name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if item has a valid image
  const hasImage = item.image && item.image.trim() !== '';

  // Check if item has customization options
  const hasCustomOptions = item.customOptions && item.customOptions.length > 0;

  // Calculate total price based on selections
  const totalPrice = useMemo(() => {
    let price = item.price;

    // Add price modifiers from selected choices
    if (item.customOptions) {
      item.customOptions.forEach((option) => {
        const selection = selectedChoices[option.id];

        if (option.type === 'radio' && typeof selection === 'string') {
          // Single selection (radio button)
          const choice = option.choices.find((c) => c.id === selection);
          if (choice) {
            price += choice.priceModifier;
          }
        } else if (option.type === 'checkbox' && Array.isArray(selection)) {
          // Multiple selections (checkboxes)
          selection.forEach((choiceId) => {
            const choice = option.choices.find((c) => c.id === choiceId);
            if (choice) {
              price += choice.priceModifier;
            }
          });
        }
      });
    }

    return price * quantity;
  }, [item, selectedChoices, quantity]);

  const handleChoiceSelect = (optionId: string, choiceId: string, type: 'radio' | 'checkbox', maxSelection?: number) => {
    setSelectedChoices((prev) => {
      if (type === 'radio') {
        // Radio: replace with new selection
        return {
          ...prev,
          [optionId]: choiceId,
        };
      } else {
        // Checkbox: toggle selection
        const currentSelections = (prev[optionId] as string[]) || [];
        const isSelected = currentSelections.includes(choiceId);

        if (isSelected) {
          // Deselecting - always allowed
          return {
            ...prev,
            [optionId]: currentSelections.filter(id => id !== choiceId),
          };
        } else {
          // Selecting - check max selection limit
          if (maxSelection !== undefined && currentSelections.length >= maxSelection) {
            // Max selections reached, don't add more
            return prev;
          }
          return {
            ...prev,
            [optionId]: [...currentSelections, choiceId],
          };
        }
      }
    });
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
        const selection = selectedChoices[option.id];

        if (option.type === 'radio' && typeof selection === 'string') {
          // Single selection (radio button)
          const choice = option.choices.find((c) => c.id === selection);
          if (choice) {
            customizations.push({
              optionId: option.id,
              optionName: option.name,
              choiceId: choice.id,
              choiceLabel: choice.label,
              priceModifier: choice.priceModifier,
            });
          }
        } else if (option.type === 'checkbox' && Array.isArray(selection)) {
          // Multiple selections (checkboxes)
          selection.forEach((choiceId) => {
            const choice = option.choices.find((c) => c.id === choiceId);
            if (choice) {
              customizations.push({
                optionId: option.id,
                optionName: option.name,
                choiceId: choice.id,
                choiceLabel: choice.label,
                priceModifier: choice.priceModifier,
              });
            }
          });
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
      const selection = selectedChoices[option.id];

      if (option.type === 'radio') {
        // Radio: check if required or has minSelection
        if (option.required || (option.minSelection && option.minSelection > 0)) {
          return typeof selection === 'string';
        }
      } else if (option.type === 'checkbox') {
        // Checkbox: check minSelection requirement
        if (option.minSelection && option.minSelection > 0) {
          return Array.isArray(selection) && selection.length >= option.minSelection;
        } else if (option.required) {
          // Fallback to required flag if minSelection not set
          return Array.isArray(selection) && selection.length > 0;
        }
      }
      return true;
    });
  }, [item.customOptions, selectedChoices]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" showCloseButton={false}>
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header with Close Button */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Item Image and Basic Info */}
          <div className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="relative w-24 h-24 shrink-0">
                {hasImage ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="rounded-2xl object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-2xl">
                      {getInitials(item.name)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-1">{item.name}</h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{item.description}</p>
                <p className="text-2xl font-bold">${item.price.toFixed(2)}</p>
              </div>
            </div>

            {/* Preparation Time */}
            {item.preparationTime && (
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{item.preparationTime}</span>
              </div>
            )}

            {/* Allergens and Dietary Info */}
            {((item.allergens && item.allergens.length > 0) ||
              (item.dietary && item.dietary.length > 0)) && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {item.allergens && item.allergens.map((allergen) => (
                    <span
                      key={`allergen-${allergen}`}
                      className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-medium"
                    >
                      ⚠️ {allergen}
                    </span>
                  ))}
                  {item.dietary && item.dietary.map((diet) => (
                    <span
                      key={`dietary-${diet}`}
                      className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium capitalize"
                    >
                      ✓ {diet}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customization Options */}
          {hasCustomOptions && (
            <div className="px-6 pb-6">
              {item.customOptions?.map((option) => {
                // Get current selection count for checkbox options
                const currentSelectionCount = option.type === 'checkbox' && Array.isArray(selectedChoices[option.id])
                  ? (selectedChoices[option.id] as string[]).length
                  : 0;

                return (
                  <div key={option.id} className="mb-6">
                    <div className="mb-3">
                      <h3 className="font-bold text-base">
                        {option.name}
                        {option.type === 'checkbox' && option.maxSelection && option.maxSelection > 1 && (
                          <span className="text-gray-500 font-normal ml-1">
                            ({currentSelectionCount}/{option.maxSelection})
                          </span>
                        )}
                        {(option.required || (option.minSelection && option.minSelection > 0)) ? (
                          <span className="text-red-500 ml-1">*</span>
                        ): null}
                      </h3>
                      {option.type === 'checkbox' && option.maxSelection && (
                        <p className="text-xs text-gray-500 mt-1">
                          {option.minSelection && option.minSelection > 0
                            ? `Select ${option.minSelection} to ${option.maxSelection} options`
                            : `Select up to ${option.maxSelection} options`}
                        </p>
                      )}
                    </div>
                  <div className="space-y-2">
                    {option.choices.map((choice) => {
                      // Check if this choice is selected
                      const isSelected = option.type === 'radio'
                        ? selectedChoices[option.id] === choice.id
                        : Array.isArray(selectedChoices[option.id]) &&
                          (selectedChoices[option.id] as string[]).includes(choice.id);

                      return (
                        <button
                          key={choice.id}
                          onClick={() => handleChoiceSelect(option.id, choice.id, option.type, option.maxSelection)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${
                            isSelected
                              ? 'bg-black text-white border-black'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <span className="font-medium">{choice.label}</span>
                          {choice.priceModifier > 0 && (
                            <span className="font-bold">
                              {option.type === 'radio'
                                ? `$${(item.price + choice.priceModifier).toFixed(2)}`
                                : `+$${choice.priceModifier.toFixed(2)}`
                              }
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </div>
          )}

          {/* Quantity Selector */}
          <div className="px-6 pb-6">
            <h3 className="font-bold text-base mb-3">Quantity</h3>
            <div className="flex items-center gap-6">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="w-12 h-12 border-2 border-gray-300 rounded-xl hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xl"
              >
                −
              </button>
              <span className="text-2xl font-bold min-w-[40px] text-center">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 99}
                className="w-12 h-12 border-2 border-gray-300 rounded-xl hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xl"
              >
                +
              </button>
            </div>
            {existingQuantityInCart > 0 && (
              <p className="text-sm text-gray-600 mt-3">
                Already in cart: {existingQuantityInCart} item{existingQuantityInCart > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Fixed Bottom Button */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Cart • ${totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </Modal>
  );
}
