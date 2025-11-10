import { Restaurant } from '@/types/restaurant';

export const restaurants: Restaurant[] = [
  {
    id: 'r1',
    name: 'La Brasserie',
    themeColor: '#E68E2E',
    logo: '/logos/brasserie.png',
    branches: [
      { id: 'b1', name: 'Main Dining', tables: 15 },
      { id: 'b2', name: 'Rooftop Lounge', tables: 8 },
    ],
  },
  {
    id: 'r2',
    name: 'Sushi Mori',
    themeColor: '#008080',
    logo: '/logos/sushi.png',
    branches: [
      { id: 'b1', name: 'Downtown', tables: 12 },
      { id: 'b2', name: 'Beachside', tables: 10 },
    ],
  },
  {
    id: 'r3',
    name: 'Casa di Pizza',
    themeColor: '#B82C2C',
    logo: '/logos/pizza.png',
    branches: [{ id: 'b1', name: 'City Center', tables: 20 }],
  },
];

export function getRestaurantById(id: string): Restaurant | undefined {
  return restaurants.find((r) => r.id === id);
}

export function getBranchById(
  restaurant: Restaurant,
  branchId: string
): Restaurant['branches'][0] | undefined {
  return restaurant.branches.find((b) => b.id === branchId);
}
