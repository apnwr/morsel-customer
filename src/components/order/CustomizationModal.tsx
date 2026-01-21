"use client";

import React, { useState, useMemo, useEffect } from "react";
import { MenuItem } from "@/types/menu";
import { Customization } from "@/types/cart";
import { Modal } from "@/components/ui/Modal";
import Image from "next/image";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  lastCustomizations,
}: CustomizationModalProps) {
  // For radio options: optionId -> choiceId
  // For checkbox options: optionId -> choiceId[] (multiple selections)
  const [selectedChoices, setSelectedChoices] = useState<
    Record<string, string | string[]>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(
    new Set()
  );

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

          if (option.type === "radio" && matchingCustomizations.length > 0) {
            // For radio, take the first matching choice
            selections[option.id] = matchingCustomizations[0].choiceId;
          } else if (
            option.type === "checkbox" &&
            matchingCustomizations.length > 0
          ) {
            // For checkbox, collect all matching choices
            selections[option.id] = matchingCustomizations.map(
              (c) => c.choiceId
            );
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
        // Initialize required options and variant options as expanded by default
        if (item.customOptions) {
          const optionsToExpand = item.customOptions
            .filter((opt) => 
              opt.id === "variant" || // Main variant option
              opt.id.startsWith("variant") || // Any variant-related options
              opt.required || // Required options should be visible
              (opt.minSelection && opt.minSelection > 0) // Options with minimum selection
            )
            .map((opt) => opt.id);
          setExpandedOptions(new Set(optionsToExpand));
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [isOpen, lastCustomizations, item]);

  // Toggle accordion for customization option
  const toggleOption = (optionId: string) => {
    setExpandedOptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(optionId)) {
        newSet.delete(optionId);
      } else {
        newSet.add(optionId);
      }
      return newSet;
    });
  };

  // Helper function to get initials from item name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if item has a valid image
  const hasImage = item.image && item.image.trim() !== "";

  // Check for vegetarian/non-vegetarian status from allergens or dietary arrays
  const getDietaryType = useMemo(() => {
    const allDietaryInfo = [
      ...(item.allergens || []),
      ...(item.dietary || [])
    ].map(d => d.toLowerCase());
    
    if (allDietaryInfo.some(d => d === 'non-vegetarian' || d === 'non vegetarian' || d === 'nonvegetarian')) {
      return 'non-vegetarian';
    }
    if (allDietaryInfo.some(d => d === 'vegetarian' || d === 'veg')) {
      return 'vegetarian';
    }
    return null;
  }, [item.allergens, item.dietary]);

  // Check if item has customization options
  const hasCustomOptions = item.customOptions && item.customOptions.length > 0;

  // Calculate per-item price with customizations (without quantity multiplier)
  const itemPriceWithCustomizations = useMemo(() => {
    let price = item.price;

    // Add price modifiers from selected choices
    if (item.customOptions) {
      item.customOptions.forEach((option) => {
        const selection = selectedChoices[option.id];

        if (option.type === "radio" && typeof selection === "string") {
          // Single selection (radio button)
          const choice = option.choices.find((c) => c.id === selection);
          if (choice) {
            price += choice.priceModifier;
          }
        } else if (option.type === "checkbox" && Array.isArray(selection)) {
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

    return price;
  }, [item, selectedChoices]);

  // Calculate total price based on selections (includes quantity)
  const totalPrice = useMemo(() => {
    return itemPriceWithCustomizations * quantity;
  }, [itemPriceWithCustomizations, quantity]);

  const handleChoiceSelect = (
    optionId: string,
    choiceId: string,
    type: "radio" | "checkbox",
    maxSelection?: number
  ) => {
    setSelectedChoices((prev) => {
      if (type === "radio") {
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
            [optionId]: currentSelections.filter((id) => id !== choiceId),
          };
        } else {
          // Selecting - check max selection limit
          if (
            maxSelection !== undefined &&
            currentSelections.length >= maxSelection
          ) {
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

        if (option.type === "radio" && typeof selection === "string") {
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
        } else if (option.type === "checkbox" && Array.isArray(selection)) {
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

      if (option.type === "radio") {
        // Radio: check if required or has minSelection
        if (
          option.required ||
          (option.minSelection && option.minSelection > 0)
        ) {
          return typeof selection === "string";
        }
      } else if (option.type === "checkbox") {
        // Checkbox: check minSelection requirement
        if (option.minSelection && option.minSelection > 0) {
          return (
            Array.isArray(selection) && selection.length >= option.minSelection
          );
        } else if (option.required) {
          // Fallback to required flag if minSelection not set
          return Array.isArray(selection) && selection.length > 0;
        }
      }
      return true;
    });
  }, [item.customOptions, selectedChoices]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      showCloseButton={false}
    >
      <div className="flex flex-col max-h-[90vh] bg-[#F7F8F8]">
        {/* Header with Item Info and Close Button */}
        <div className="p-4 pt-5 border-b border-gray-200 bg-[#F7F8F8]">
          <div className="flex items-start gap-3 mb-3">
            {/* Item Image */}
            <div className="relative w-16 h-16 shrink-0 border-2 border-white rounded-lg overflow-hidden">
              {hasImage ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className=" object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-sm">
                    {getInitials(item.name)}
                  </span>
                </div>
              )}
            </div>

            {/* Item Name and Description */}
            <div className="flex-1 min-w-0">
              {/* Vegetarian/Non-Vegetarian Symbol */}
              {getDietaryType && (
                <div 
                  className={`w-4 h-4 flex items-center justify-center rounded-[3px] border-[1.5px] bg-white mb-1 ${
                    getDietaryType === 'vegetarian' 
                      ? 'border-green-600' 
                      : 'border-red-600'
                  }`}
                  aria-label={getDietaryType === 'vegetarian' ? 'Vegetarian' : 'Non-vegetarian'}
                  title={getDietaryType === 'vegetarian' ? 'Vegetarian' : 'Non-vegetarian'}
                >
                  {getDietaryType === 'vegetarian' ? (
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                  ) : (
                    <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-red-600" />
                  )}
                </div>
              )}
              <h3 className="font-bold text-sm mb-1 truncate">{item.name}</h3>
              <p className="text-[#00000050] text-[10px] line-clamp-1">
                {item.description}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Preparation Time */}
          {/* {item.preparationTime && (
            <div className="flex items-center gap-2 text-gray-600 my-2">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">{item.preparationTime} mins</span>
            </div>
          )} */}
          {/* Allergens and Dietary Info */}
          {((item.allergens && item.allergens.length > 0) ||
            (item.dietary && item.dietary.length > 0)) && (
            <div className="flex flex-wrap gap-1.5">
              {item.allergens &&
                item.allergens.map((allergen) => (
                  <span
                    key={`allergen-${allergen}`}
                    className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-[10px] font-medium leading-none"
                  >
                    ⚠️ {allergen}
                  </span>
                ))}
              {item.dietary &&
                item.dietary.map((diet) => (
                  <span
                    key={`dietary-${diet}`}
                    className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-medium capitalize leading-none"
                  >
                    ✓ {diet}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="shrink min-h-0 overflow-y-auto scrollbar-hide pt-4">
          {/* Customization Options */}
          {hasCustomOptions && (
            <div className="px-6 pb-6">
              {item.customOptions?.map((option) => {
                // Get current selection count for checkbox options
                const currentSelectionCount =
                  option.type === "checkbox" &&
                  Array.isArray(selectedChoices[option.id])
                    ? (selectedChoices[option.id] as string[]).length
                    : 0;

                const isExpanded = expandedOptions.has(option.id);

                return (
                  <div key={option.id} className="mb-6">
                    {/* Accordion Header */}
                    <button
                      onClick={() => toggleOption(option.id)}
                      className="w-full flex items-center gap-3 mb-3"
                    >
                      <motion.div
                        className="shrink-0 w-5 h-5 relative"
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <Image
                          src="/icons/Chevron.png"
                          alt={isExpanded ? "Collapse" : "Expand"}
                          fill
                          className="object-contain"
                        />
                      </motion.div>
                      <div className="flex-1 text-left">
                        <h3 className="font-bold text-lg">
                          {option.name}
                          {option.type === "checkbox" &&
                          option.maxSelection &&
                          option.maxSelection > 1 &&
                          currentSelectionCount > 0 ? (
                            <span className="text-gray-500 font-normal ml-1">
                              ({currentSelectionCount}/{option.maxSelection})
                            </span>
                          ) : null}
                          {option.required ||
                          (option.minSelection && option.minSelection > 0) ? (
                            <span className="text-red-500 ml-1">*</span>
                          ) : null}
                        </h3>
                        {/* {option.type === "checkbox" && option.maxSelection && (
                          <p className="text-xs text-gray-500 mt-1">
                            {option.minSelection && option.minSelection > 0
                              ? `Select ${option.minSelection} to ${option.maxSelection} options`
                              : `Select up to ${option.maxSelection} options`}
                          </p>
                        )} */}
                      </div>
                    </button>

                    {/* Accordion Content */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2">
                            {option.choices.map((choice) => {
                              // Check if this choice is selected
                              const isSelected =
                                option.type === "radio"
                                  ? selectedChoices[option.id] === choice.id
                                  : Array.isArray(selectedChoices[option.id]) &&
                                    (
                                      selectedChoices[option.id] as string[]
                                    ).includes(choice.id);

                              return (
                                <button
                                  key={choice.id}
                                  onClick={() =>
                                    handleChoiceSelect(
                                      option.id,
                                      choice.id,
                                      option.type,
                                      option.maxSelection
                                    )
                                  }
                                  className={`w-full flex items-center justify-between p-4 rounded-[12px] transition-all ${
                                    isSelected
                                      ? "bg-black text-white"
                                      : "bg-white"
                                  }`}
                                >
                                  <span className="font-medium text-sm">
                                    {choice.label}
                                  </span>
                                  {choice.priceModifier > 0 && (
                                    <span className="font-bold text-sm">
                                      + ${choice.priceModifier.toFixed(2)}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Fixed Bottom Row with Quantity and Add to Cart Button */}
        <div className="p-6 bg-[#F7F8F8]">
          <div className="flex items-center gap-4">
            {/* Quantity Selector - 30% width */}
            <div className="flex items-center justify-between w-[30%] bg-white border-2 border-black rounded-[12px] py-[12px] px-3">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-lg active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg text-black"
              >
                −
              </button>
              <span className="text-lg font-bold min-w-[30px] text-center">
                {quantity}
              </span>
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 99}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-lg active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Image
                  src="/icons/Plus.png"
                  alt="Increase quantity"
                  width={16}
                  height={16}
                  className="object-contain"
                />
              </button>
            </div>

            {/* Add to Cart Button - 70% width */}
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="flex-1 py-4 bg-black text-white rounded-[12px] font-bold text-lg hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Item - ${totalPrice.toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
