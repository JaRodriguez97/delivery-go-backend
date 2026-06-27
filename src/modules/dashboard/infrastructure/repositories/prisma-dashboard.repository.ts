import { prisma } from "../../../../shared/config/database";
import {
  IDashboardRepository,
  DashboardMetrics,
  RecentOrderRow,
} from "../../domain/repositories/dashboard.repository";

export class PrismaDashboardRepository implements IDashboardRepository {
  async getMetrics(): Promise<DashboardMetrics> {
    const [
      totalOrders,
      revenueResult,
      deliveryFeeResult,
      activeRestaurants,
      activeRiders,
      avgDelivery,
      deliveredCount,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
      prisma.order.aggregate({ _sum: { deliveryFee: true } }),
      prisma.restaurant.count({
        where: { status: { name: "ACTIVE" } },
      }),
      prisma.courier.count({
        where: { status: "ACTIVE" },
      }),
      prisma.delivery.aggregate({
        where: { completedAt: { not: null } },
        _count: { id: true },
      }),
      prisma.delivery.count({
        where: { status: "DELIVERED" },
      }),
    ]);

    // Calculate average delivery time from completed deliveries
    const completedDeliveries = await prisma.delivery.findMany({
      where: {
        completedAt: { not: null },
        startedAt: { not: null },
      },
      select: { startedAt: true, completedAt: true },
      take: 100,
      orderBy: { completedAt: "desc" },
    });

    let averageDeliveryTime = 0;
    if (completedDeliveries.length > 0) {
      const totalMinutes = completedDeliveries.reduce((acc, d) => {
        const diff =
          (d.completedAt!.getTime() - d.startedAt!.getTime()) / 60000;
        return acc + diff;
      }, 0);
      averageDeliveryTime = Math.round(
        totalMinutes / completedDeliveries.length,
      );
    }

    const successRate =
      totalOrders > 0
        ? Math.round((deliveredCount / totalOrders) * 10000) / 100
        : 0;

    return {
      totalOrders,
      totalRevenue: Number(revenueResult._sum.totalAmount ?? 0),
      totalDeliveryFees: Number(deliveryFeeResult._sum.deliveryFee ?? 0),
      activeRestaurants,
      activeRiders,
      averageDeliveryTime,
      successRate,
    };
  }

  async getRecentOrders(limit: number): Promise<RecentOrderRow[]> {
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { include: { profile: true } },
        restaurant: { include: { profile: true } },
        status: true,
      },
    });

    return orders.map((o, index) => ({
      id: o.id,
      orderNumber: `ORD-${new Date(o.createdAt ?? Date.now()).getFullYear()}-${String(index + 1).padStart(3, "0")}`,
      customerName: o.customer?.profile
        ? `${o.customer.profile.firstName ?? ""} ${o.customer.profile.lastName ?? ""}`.trim()
        : "N/A",
      customerEmail: o.customer?.profile?.email ?? "",
      restaurantName: o.restaurant?.profile?.name ?? "N/A",
      amount: Number(o.totalAmount ?? 0),
      status: o.status?.name ?? "UNKNOWN",
      createdAt: o.createdAt ?? new Date(),
    }));
  }
}
