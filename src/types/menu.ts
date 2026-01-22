export interface CustomChoice {
  id: string;
  label: string;
  priceModifier: number;
}

export interface CustomOption {
  id: string;
  name: string;
  type: 'radio' | 'checkbox';
  required: boolean;
  choices: CustomChoice[];
  minSelection?: number; // Minimum number of selections required
  maxSelection?: number; // Maximum number of selections allowed
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  tags: string[];
  allergens?: string[];
  dietary?: string[];
  preparationTime?: string;
  isCustomizable: boolean;
  customOptions?: CustomOption[];
  spiceLevels?: string[]; // Array of spice level options (e.g., ["None", "Mild", "Medium", "Hot", "Extra Hot"])
  spiceLevelEnabled?: boolean; // Whether spice level selection is enabled for this item
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
  showMenuName?: boolean; // Controls whether to display the menu name (defaults to false)
}
