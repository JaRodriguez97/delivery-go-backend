import { prisma } from "../../../../shared/config/database";
import { Prisma } from "@prisma/client";
import {
  IReportsRepository,
  SalesReportResult,
  PerformanceReportResult,
  FinancialReportResult,
  ReportSummaryResult,
  ReportSummaryFilters,
  ReportSummaryFilterMetadata,
} from "../../domain/repositories/reports.repository";

export class PrismaReportsRepository implements IReportsRepository {
  private buildSummaryOrderWhere(
    filters: ReportSummaryFilters,
  ): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {
      createdAt: { gte: filters.startDate, lte: filters.endDate },
    };

    if (filters.restaurantId) {
      where.restaurantId = filters.restaurantId;
    }

    if (filters.paymentMethodId) {
      where.invoice = {
        is: {
          payments: {
            some: {
              paymentMethodId: filters.paymentMethodId,
              deletedAt: null,
            },
          },
        },
      };
    }

    return where;
  }

  async getSummary(
    filters: ReportSummaryFilters,
  ): Promise<ReportSummaryResult> {
    const orderWhere = this.buildSummaryOrderWhere(filters);

    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        status: true,
        restaurant: {
          include: {
            profile: true,
          },
        },
      },
    });

    const orderIds = orders.map((order) => order.id);

    const [deliveries, incidents] = await Promise.all([
      prisma.delivery.findMany({
        where: {
          orderId: { in: orderIds },
          startedAt: { gte: filters.startDate, lte: filters.endDate },
        },
        include: {
          courier: {
            include: {
              profile: true,
            },
          },
          order: {
            select: {
              deliveryFee: true,
            },
          },
        },
      }),
      prisma.orderIncident.findMany({
        where: {
          orderId: { in: orderIds },
          createdAt: { gte: filters.startDate, lte: filters.endDate },
        },
        include: {
          order: {
            select: {
              restaurantId: true,
            },
          },
        },
      }),
    ]);

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (acc, order) => acc + Number(order.totalAmount ?? 0),
      0,
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const completedDeliveries = deliveries.filter(
      (delivery) => delivery.startedAt && delivery.completedAt,
    );
    const averageDeliveryTime =
      completedDeliveries.length > 0
        ? completedDeliveries.reduce((acc, delivery) => {
            return (
              acc +
              (delivery.completedAt!.getTime() -
                delivery.startedAt!.getTime()) /
                60000
            );
          }, 0) / completedDeliveries.length
        : 0;

    const totalIncidents = incidents.length;
    const incidentRate =
      totalOrders > 0 ? (totalIncidents / totalOrders) * 100 : 0;

    const dailyRevenueMap = new Map<
      string,
      { revenue: number; orderCount: number }
    >();
    const orderStatusMap = new Map<string, number>();
    const topRestaurantMap = new Map<
      string,
      {
        name: string;
        orderCount: number;
        revenue: number;
        totalIncidents: number;
      }
    >();

    for (const order of orders) {
      const day = order.createdAt
        ? order.createdAt.toISOString().split("T")[0]
        : "Sin fecha";
      const dayEntry = dailyRevenueMap.get(day) ?? {
        revenue: 0,
        orderCount: 0,
      };
      dayEntry.revenue += Number(order.totalAmount ?? 0);
      dayEntry.orderCount += 1;
      dailyRevenueMap.set(day, dayEntry);

      const statusName = (order.status?.name ?? "SIN_ESTADO").toUpperCase();
      orderStatusMap.set(statusName, (orderStatusMap.get(statusName) ?? 0) + 1);

      const restaurantId = order.restaurantId ?? "unknown";
      const restaurantEntry = topRestaurantMap.get(restaurantId) ?? {
        name: order.restaurant?.profile?.name ?? "Sin nombre",
        orderCount: 0,
        revenue: 0,
        totalIncidents: 0,
      };

      restaurantEntry.orderCount += 1;
      restaurantEntry.revenue += Number(order.totalAmount ?? 0);
      topRestaurantMap.set(restaurantId, restaurantEntry);
    }

    for (const incident of incidents) {
      const restaurantId = incident.order?.restaurantId ?? "unknown";
      const restaurantEntry = topRestaurantMap.get(restaurantId) ?? {
        name: "Sin nombre",
        orderCount: 0,
        revenue: 0,
        totalIncidents: 0,
      };

      restaurantEntry.totalIncidents += 1;
      topRestaurantMap.set(restaurantId, restaurantEntry);
    }

    const riderMap = new Map<
      string,
      {
        name: string;
        totalDeliveries: number;
        completedDeliveries: number;
        totalEarnings: number;
      }
    >();

    for (const delivery of deliveries) {
      const riderId = delivery.courierId ?? "unknown";
      const riderEntry = riderMap.get(riderId) ?? {
        name: delivery.courier?.profile
          ? `${delivery.courier.profile.firstName ?? ""} ${delivery.courier.profile.lastName ?? ""}`.trim() ||
            "Desconocido"
          : "Desconocido",
        totalDeliveries: 0,
        completedDeliveries: 0,
        totalEarnings: 0,
      };

      riderEntry.totalDeliveries += 1;

      if (delivery.completedAt) {
        riderEntry.completedDeliveries += 1;
        riderEntry.totalEarnings += Number(delivery.order?.deliveryFee ?? 0);
      }

      riderMap.set(riderId, riderEntry);
    }

    return {
      periodStart: filters.startDate.toISOString(),
      periodEnd: filters.endDate.toISOString(),
      kpis: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
        totalIncidents,
        incidentRate: Math.round(incidentRate * 100) / 100,
      },
      dailyRevenue: Array.from(dailyRevenueMap.entries())
        .map(([date, value]) => ({
          date,
          revenue: Math.round(value.revenue * 100) / 100,
          orderCount: value.orderCount,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      orderStatusBreakdown: Array.from(orderStatusMap.entries())
        .map(([status, count]) => ({
          status,
          count,
          percentage:
            totalOrders > 0
              ? Math.round((count / totalOrders) * 100 * 100) / 100
              : 0,
        }))
        .sort((a, b) => b.count - a.count),
      topRestaurants: Array.from(topRestaurantMap.entries())
        .map(([restaurantId, value]) => ({
          restaurantId,
          name: value.name,
          orderCount: value.orderCount,
          revenue: Math.round(value.revenue * 100) / 100,
          totalIncidents: value.totalIncidents,
          incidentRate:
            value.orderCount > 0
              ? Math.round(
                  (value.totalIncidents / value.orderCount) * 100 * 100,
                ) / 100
              : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      topRiders: Array.from(riderMap.entries())
        .map(([riderId, value]) => ({
          riderId,
          name: value.name,
          completedDeliveries: value.completedDeliveries,
          totalEarnings: Math.round(value.totalEarnings * 100) / 100,
          completionRate:
            value.totalDeliveries > 0
              ? Math.round(
                  (value.completedDeliveries / value.totalDeliveries) *
                    100 *
                    100,
                ) / 100
              : 0,
        }))
        .sort((a, b) => b.completedDeliveries - a.completedDeliveries)
        .slice(0, 5),
    };
  }

  async getSummaryFilterMetadata(): Promise<ReportSummaryFilterMetadata> {
    const [restaurants, paymentMethods] = await Promise.all([
      prisma.restaurant.findMany({
        select: {
          id: true,
          profile: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.paymentMethod.findMany({
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    return {
      restaurants: restaurants.map((restaurant) => ({
        id: restaurant.id,
        name:
          restaurant.profile?.name?.trim() ||
          `Restaurante ${restaurant.id.slice(0, 8).toUpperCase()}`,
      })),
      paymentMethods: paymentMethods.map((method) => ({
        id: method.id,
        name: method.name,
      })),
    };
  }

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
