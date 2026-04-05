export interface SalesReportResult {
  periodStart: string;
  periodEnd: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topRestaurants: {
    restaurantId: string;
    name: string;
    revenue: number;
    orderCount: number;
  }[];
  dailyBreakdown: { date: string; revenue: number; orderCount: number }[];
}

export interface PerformanceReportResult {
  periodStart: string;
  periodEnd: string;
  averageDeliveryTime: number;
  successRate: number;
  topRiders: {
    riderId: string;
    name: string;
    totalDeliveries: number;
    completionRate: number;
  }[];
}

export interface FinancialReportResult {
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalPayments: number;
  pendingPayments: number;
  refundedAmount: number;
}

export interface IReportsRepository {
  getSalesReport(startDate: Date, endDate: Date): Promise<SalesReportResult>;
  getPerformanceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceReportResult>;
  getFinancialReport(
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialReportResult>;
}
