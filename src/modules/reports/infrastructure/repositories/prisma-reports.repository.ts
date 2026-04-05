import { prisma } from "../../../../shared/config/database";
import {
  IReportsRepository,
  SalesReportResult,
  PerformanceReportResult,
  FinancialReportResult,
} from "../../domain/repositories/reports.repository";

export class PrismaReportsRepository implements IReportsRepository {
  async getSalesReport(
    startDate: Date,
    endDate: Date,
  ): Promise<SalesReportResult> {
    const dateFilter = { createdAt: { gte: startDate, lte: endDate } };

    const orders = await prisma.order.findMany({
      where: dateFilter,
      include: {
        restaurant: { include: { profile: true } },
      },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (s, o) => s + Number(o.totalAmount ?? 0),
      0,
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top restaurants by revenue
    const restMap = new Map<
      string,
      { name: string; revenue: number; orderCount: number }
    >();
    for (const o of orders) {
      const rid = o.restaurantId ?? "unknown";
      const rName = o.restaurant?.profile?.name ?? "Sin nombre";
      const existing = restMap.get(rid) ?? {
        name: rName,
        revenue: 0,
        orderCount: 0,
      };
      existing.revenue += Number(o.totalAmount ?? 0);
      existing.orderCount += 1;
      restMap.set(rid, existing);
    }
    const topRestaurants = Array.from(restMap.entries())
      .map(([restaurantId, data]) => ({ restaurantId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Daily breakdown
    const dayMap = new Map<string, { revenue: number; orderCount: number }>();
    for (const o of orders) {
      const day = o.createdAt
        ? o.createdAt.toISOString().split("T")[0]
        : "unknown";
      const existing = dayMap.get(day) ?? { revenue: 0, orderCount: 0 };
      existing.revenue += Number(o.totalAmount ?? 0);
      existing.orderCount += 1;
      dayMap.set(day, existing);
    }
    const dailyBreakdown = Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      topRestaurants,
      dailyBreakdown,
    };
  }

  async getPerformanceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceReportResult> {
    const deliveries = await prisma.delivery.findMany({
      where: {
        startedAt: { gte: startDate, lte: endDate },
      },
      include: {
        courier: { include: { profile: true } },
      },
    });

    const completed = deliveries.filter((d) => d.completedAt);
    const totalDeliveries = deliveries.length;
    const successRate =
      totalDeliveries > 0 ? (completed.length / totalDeliveries) * 100 : 0;

    // Average delivery time in minutes
    let totalMinutes = 0;
    let countWithTime = 0;
    for (const d of completed) {
      if (d.startedAt && d.completedAt) {
        totalMinutes +=
          (d.completedAt.getTime() - d.startedAt.getTime()) / 60000;
        countWithTime++;
      }
    }
    const averageDeliveryTime =
      countWithTime > 0 ? totalMinutes / countWithTime : 0;

    // Top riders
    const riderMap = new Map<
      string,
      { name: string; totalDeliveries: number; completed: number }
    >();
    for (const d of deliveries) {
      const cId = d.courierId ?? "unknown";
      const name = d.courier?.profile
        ? `${d.courier.profile.firstName ?? ""} ${d.courier.profile.lastName ?? ""}`.trim()
        : "Desconocido";
      const existing = riderMap.get(cId) ?? {
        name,
        totalDeliveries: 0,
        completed: 0,
      };
      existing.totalDeliveries += 1;
      if (d.completedAt) existing.completed += 1;
      riderMap.set(cId, existing);
    }
    const topRiders = Array.from(riderMap.entries())
      .map(([riderId, data]) => ({
        riderId,
        name: data.name,
        totalDeliveries: data.totalDeliveries,
        completionRate:
          data.totalDeliveries > 0
            ? (data.completed / data.totalDeliveries) * 100
            : 0,
      }))
      .sort((a, b) => b.totalDeliveries - a.totalDeliveries)
      .slice(0, 10);

    return {
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      topRiders,
    };
  }

  async getFinancialReport(
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialReportResult> {
    const dateFilter = { createdAt: { gte: startDate, lte: endDate } };

    const [orderAgg, paymentGroups, refundAgg] = await Promise.all([
      prisma.order.aggregate({
        where: dateFilter,
        _sum: { totalAmount: true },
      }),
      prisma.payment.groupBy({
        by: ["status"],
        where: { ...dateFilter, deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.refund.aggregate({
        where: dateFilter,
        _sum: { amount: true },
      }),
    ]);

    let totalPayments = 0;
    let pendingPayments = 0;
    for (const g of paymentGroups) {
      const amt = Number(g._sum.amount ?? 0);
      totalPayments += amt;
      if (g.status === "PENDING") pendingPayments += amt;
    }

    return {
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      totalRevenue: Number(orderAgg._sum.totalAmount ?? 0),
      totalPayments,
      pendingPayments,
      refundedAmount: Number(refundAgg._sum.amount ?? 0),
    };
  }
}
