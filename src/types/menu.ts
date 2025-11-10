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
  isCustomizable: boolean;
  customOptions?: CustomOption[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
}
