export interface DashboardMetrics {
  totalOrders: number;
  totalRevenue: number;
  totalDeliveryFees: number;
  activeRestaurants: number;
  activeRiders: number;
  averageDeliveryTime: number;
  successRate: number;
}

export interface RecentOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  restaurantName: string;
  amount: number;
  status: string;
  createdAt: Date;
}

export interface IDashboardRepository {
  getMetrics(): Promise<DashboardMetrics>;
  getRecentOrders(limit: number): Promise<RecentOrderRow[]>;
}
