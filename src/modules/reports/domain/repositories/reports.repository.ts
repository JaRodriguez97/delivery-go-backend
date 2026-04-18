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

export interface ReportSummaryKpis {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  averageDeliveryTime: number;
  totalIncidents: number;
  incidentRate: number;
}

export interface ReportSummaryDailyRevenuePoint {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface ReportSummaryStatusBreakdownItem {
  status: string;
  count: number;
  percentage: number;
}

export interface ReportSummaryTopRestaurantItem {
  restaurantId: string;
  name: string;
  orderCount: number;
  revenue: number;
  totalIncidents: number;
  incidentRate: number;
}

export interface ReportSummaryTopRiderItem {
  riderId: string;
  name: string;
  completedDeliveries: number;
  totalEarnings: number;
  completionRate: number;
}

export interface ReportSummaryResult {
  periodStart: string;
  periodEnd: string;
  kpis: ReportSummaryKpis;
  dailyRevenue: ReportSummaryDailyRevenuePoint[];
  orderStatusBreakdown: ReportSummaryStatusBreakdownItem[];
  topRestaurants: ReportSummaryTopRestaurantItem[];
  topRiders: ReportSummaryTopRiderItem[];
}

export interface ReportSummaryFilters {
  startDate: Date;
  endDate: Date;
  restaurantId?: string;
  paymentMethodId?: string;
}

export interface ReportFilterOption {
  id: string;
  name: string;
}

export interface ReportSummaryFilterMetadata {
  restaurants: ReportFilterOption[];
  paymentMethods: ReportFilterOption[];
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
  getSummary(filters: ReportSummaryFilters): Promise<ReportSummaryResult>;
  getSummaryFilterMetadata(): Promise<ReportSummaryFilterMetadata>;
}
