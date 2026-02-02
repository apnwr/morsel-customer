/**
 * Hardcoded Items Data
 * This will be replaced by real API calls in the future
 */

import type { ItemsResponse } from '@/types/api/menu';

export const HARDCODED_ITEMS_DATA: ItemsResponse = {
  data: [
    {
      id: 'Hjl7s21cxdfsOiV2OCUf',
      businessId: 'vQX9lFoJTwpYBhF5v4aZ',
      name: 'Cafe Latte',
      description: 'A delicious coffee.',
      type: 'main',
      price: 17.99,
      preparationTime: '15 minutes',
      category: 'Drinks',
      allergens: ['soy', 'gluten'],
      dietary: ['gluten-free'],
      variants: [
        {
          name: 'Regular',
          price: 12.99,
        },
        {
          name: 'Double shot',
          price: 15.99,
        },
      ],
      addons: [
        {
          add_on_title: 'Flavors',
          min_selection: 0,
          max_selection: 2,
          add_on_options: [
            {
              name: 'Irish flavour',
              price: 2,
            },
            {
              name: 'Extra whip-cream',
              price: 1.5,
            },
          ],
        },
      ],
      createdAt: {
        _seconds: 1759698049,
        _nanoseconds: 728000000,
      },
      status: 'active',
      updatedAt: {
        _seconds: 1760021293,
        _nanoseconds: 655000000,
      },
    },
    {
      id: 'I9AfVT5TGmcJBy6MXxob',
      businessId: 'vQX9lFoJTwpYBhF5v4aZ',
      description: 'lorem ',
      type: 'dessert',
      price: 5,
      preparationTime: '20 minutes',
      category: 'Desert',
      allergens: [],
      dietary: [],
      variants: [],
      addons: [],
      createdAt: {
        _seconds: 1760022065,
        _nanoseconds: 848000000,
      },
      name: 'CKK',
      status: 'active',
      updatedAt: {
        _seconds: 1760083260,
        _nanoseconds: 885000000,
      },
    },
    {
      id: 'IswAs9mWtL6i97PIlaGt',
      businessId: 'vQX9lFoJTwpYBhF5v4aZ',
      name: 'Ice cream ',
      description: 'ice-creams',
      type: 'dessert',
      price: 12,
      preparationTime: '10 minutes',
      category: 'ice-creams',
      allergens: [],
      dietary: [],
      variants: [],
      addons: [],
      createdAt: {
        _seconds: 1759697467,
        _nanoseconds: 561000000,
      },
      status: 'active',
      updatedAt: {
        _seconds: 1760262267,
        _nanoseconds: 531000000,
      },
    },
    {
      id: 'bMGyDHNZyEjUGUADd6vR',
      businessId: 'vQX9lFoJTwpYBhF5v4aZ',
      description: 'desc',
      preparationTime: '20 minutes',
      variants: [],
      addons: [],
      createdAt: {
        _seconds: 1759691131,
        _nanoseconds: 300000000,
      },
      dietary: ['gluten-free'],
      price: 12,
      name: 'Ice cream',
      category: 'Ice-creams',
      type: 'dessert',
      allergens: ['tree nuts'],
      status: 'inactive',
      updatedAt: {
        _seconds: 1760262311,
        _nanoseconds: 567000000,
      },
    },
    {
      id: 'cWPT8QwFt5ovyEpJ7yGo',
      businessId: 'vQX9lFoJTwpYBhF5v4aZ',
      name: 'Chicken Burger',
      description:
        'A delicious chicken burger with fresh veggies and vegan cheese.',
      type: 'main',
      price: 14.99,
      preparationTime: '15 minutes',
      category: 'Vegan',
      allergens: ['soy', 'gluten'],
      dietary: ['vegan', 'gluten-free'],
      variants: [
        {
          name: 'Regular',
          price: 12.99,
        },
        {
          name: 'Double Patty',
          price: 15.99,
        },
      ],
      addons: [
        {
          add_on_title: 'Toppings',
          min_selection: 0,
          max_selection: 3,
          add_on_options: [
            {
              name: 'Avocado',
              price: 2,
            },
            {
              name: 'Extra Cheese',
              price: 1.5,
            },
          ],
        },
      ],
      createdAt: {
        _seconds: 1759697970,
        _nanoseconds: 817000000,
      },
      status: 'active',
      updatedAt: {
        _seconds: 1760191027,
        _nanoseconds: 884000000,
      },
    },
    {
      id: 'gKdmEaLAH0GggZKF6iAN',
      businessId: 'vQX9lFoJTwpYBhF5v4aZ',
      type: 'main',
      price: 14.99,
      preparationTime: '15 minutes',
      category: 'Vegan',
      allergens: ['soy', 'gluten'],
      dietary: ['vegan', 'gluten-free'],
      createdAt: {
        _seconds: 1759691275,
        _nanoseconds: 183000000,
      },
      addons: [
        {
          add_on_title: 'Extras',
          min_selection: 1,
          max_selection: 2,
          add_on_options: [
            {
              name: 'Avocado',
              price: 2,
            },
            {
              name: 'Extra nuts',
              price: 1.5,
            },
          ],
        },
      ],
      name: 'Ice cream',
      description: 'A delicious ice cream.',
      variants: [
        {
          name: 'Regular',
          price: 12.99,
        },
      ],
      status: 'active',
      updatedAt: {
        _seconds: 1759697218,
        _nanoseconds: 143000000,
      },
    },
    {
      id: 'tCzHKfNAxwRaxslds1NG',
      businessId: 'vQX9lFoJTwpYBhF5v4aZ',
      name: 'Desi chai ',
      description: 'tea ',
      type: 'beverage',
      price: 4,
      preparationTime: '20 minutes',
      category: 'Hot beverages',
      status: 'active',
      allergens: [],
      dietary: [],
      variants: [],
      addons: [],
      createdAt: {
        _seconds: 1760021447,
        _nanoseconds: 309000000,
      },
      updatedAt: {
        _seconds: 1760021447,
        _nanoseconds: 309000000,
      },
    },
  ],
};
