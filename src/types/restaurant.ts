export interface Branch {
  id: string;
  name: string;
  tables: number;
}

export interface Restaurant {
  id: string;
  name: string;
  themeColor: string;
  logo: string;
  branches: Branch[];
}

export interface RestaurantContext {
  restaurant: Restaurant;
  branch: Branch;
  table: number;
}
