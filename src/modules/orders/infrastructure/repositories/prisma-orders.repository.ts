import { prisma } from "../../../../shared/config/database";
import {
  IOrdersRepository,
  OrderListItem,
  OrderDetail,
  OrdersKpis,
  OrderFilters,
} from "../../domain/repositories/orders.repository";
import {
  PaginationParams,
  PaginatedResponse,
  paginatedResponse,
} from "../../../../shared/utils/pagination";

export class PrismaOrdersRepository implements IOrdersRepository {
  async getKpis(): Promise<OrdersKpis> {
    const [total, statusCounts, revenueResult] = await Promise.all([
      prisma.order.count(),
      prisma.order.findMany({
        select: { status: { select: { name: true } } },
      }),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
    ]);

    const counts = statusCounts.reduce(
      (acc, o) => {
        const s = (o.status?.name ?? "").toUpperCase();
        if (s === "PENDING" || s === "CONFIRMED") acc.pending++;
        else if (s === "IN_TRANSIT" || s === "PICKED_UP" || s === "PREPARING")
          acc.inTransit++;
        else if (s === "DELIVERED") acc.delivered++;
        else if (s === "CANCELLED") acc.cancelled++;
        return acc;
      },
      { pending: 0, inTransit: 0, delivered: 0, cancelled: 0 },
    );

    const totalRevenue = Number(revenueResult._sum.totalAmount ?? 0);
    const averageTicket =
      total > 0 ? Math.round((totalRevenue / total) * 100) / 100 : 0;

    return { total, ...counts, totalRevenue, averageTicket };
  }

  async getOrders(
    filters: OrderFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<OrderListItem>> {
    const where: any = {};

    if (filters.status) {
      where.status = { name: filters.status };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters.search) {
      where.OR = [
        {
          customer: {
            profile: {
              firstName: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
        {
          customer: {
            profile: {
              lastName: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
        {
          restaurant: {
            profile: {
              name: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { include: { profile: true } },
          restaurant: { include: { profile: true } },
          status: true,
          delivery: { include: { courier: { include: { profile: true } } } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const data: OrderListItem[] = orders.map((o) => ({
      id: o.id,
      restaurantName: o.restaurant?.profile?.name ?? "N/A",
      customerName: o.customer?.profile
        ? `${o.customer.profile.firstName ?? ""} ${o.customer.profile.lastName ?? ""}`.trim()
        : "N/A",
      riderName: o.delivery?.courier?.profile
        ? `${o.delivery.courier.profile.firstName ?? ""} ${o.delivery.courier.profile.lastName ?? ""}`.trim()
        : null,
      status: o.status?.name ?? "UNKNOWN",
      totalAmount: Number(o.totalAmount ?? 0),
      deliveryFee: Number(o.deliveryFee ?? 0),
      createdAt: o.createdAt ?? new Date(),
    }));

    return paginatedResponse(data, total, pagination);
  }

  async getOrderById(id: string): Promise<OrderDetail | null> {
    const o = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { include: { profile: true } },
        restaurant: { include: { profile: true } },
        delivery: { include: { courier: { include: { profile: true } } } },
        status: true,
        priority: true,
        items: true,
        statusHistories: {
          include: { status: true },
          orderBy: { changedAt: "desc" },
        },
        incidents: {
          include: { incidentType: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!o) return null;

    return {
      id: o.id,
      restaurant: {
        id: o.restaurant?.id ?? "",
        name: o.restaurant?.profile?.name ?? "N/A",
      },
      customer: {
        id: o.customer?.id ?? "",
        name: o.customer?.profile
          ? `${o.customer.profile.firstName ?? ""} ${o.customer.profile.lastName ?? ""}`.trim()
          : "N/A",
        email: o.customer?.profile?.email ?? "",
      },
      rider: o.delivery?.courier?.profile
        ? {
            id: o.delivery.courier.id,
            name: `${o.delivery.courier.profile.firstName ?? ""} ${o.delivery.courier.profile.lastName ?? ""}`.trim(),
          }
        : null,
      status: o.status?.name ?? "UNKNOWN",
      priority: o.priority?.name ?? null,
      totalAmount: Number(o.totalAmount ?? 0),
      deliveryFee: Number(o.deliveryFee ?? 0),
      items: o.items.map((i) => ({
        id: i.id,
        name: i.name ?? "",
        quantity: i.quantity ?? 0,
        unitPrice: Number(i.unitPrice ?? 0),
        totalPrice: Number(i.totalPrice ?? 0),
        note: i.note ?? null,
      })),
      statusHistory: o.statusHistories.map((h) => ({
        status: h.status?.name ?? "UNKNOWN",
        changedAt: h.changedAt ?? new Date(),
      })),
      incidents: o.incidents.map((inc) => ({
        id: inc.id,
        type: inc.incidentType?.name ?? "N/A",
        description: inc.description ?? "",
        status: inc.status ?? "UNKNOWN",
        createdAt: inc.createdAt ?? new Date(),
      })),
      createdAt: o.createdAt ?? new Date(),
      updatedAt: o.updatedAt ?? null,
    };
  }

  async createOrder(data: {
    restaurantId: string;
    customerId: string;
    priorityId?: string;
    deliveryFee?: number;
    items: {
      name: string;
      quantity: number;
      unitPrice: number;
      note?: string;
    }[];
  }): Promise<{ id: string }> {
    const totalAmount = data.items.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0,
    );

    const pendingStatus = await prisma.orderStatus.findFirst({
      where: { name: "PENDING" },
    });

    const order = await prisma.order.create({
      data: {
        restaurantId: data.restaurantId,
        customerId: data.customerId,
        statusId: pendingStatus?.id,
        priorityId: data.priorityId,
        totalAmount,
        deliveryFee: data.deliveryFee ?? 0,
        createdAt: new Date(),
        items: {
          create: data.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.unitPrice * i.quantity,
            note: i.note,
          })),
        },
      },
    });

    if (pendingStatus) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          statusId: pendingStatus.id,
          changedAt: new Date(),
        },
      });
    }

    return { id: order.id };
  }

  async updateOrder(
    id: string,
    data: { statusId?: string; priorityId?: string; courierId?: string },
  ): Promise<void> {
    const updateData: any = { updatedAt: new Date() };
    if (data.statusId) updateData.statusId = data.statusId;
    if (data.priorityId) updateData.priorityId = data.priorityId;

    await prisma.order.update({ where: { id }, data: updateData });

    if (data.statusId) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          statusId: data.statusId,
          changedAt: new Date(),
        },
      });
    }

    if (data.courierId) {
      const delivery = await prisma.delivery.create({
        data: {
          orderId: id,
          courierId: data.courierId,
          startedAt: new Date(),
          status: "ASSIGNED",
        },
      });
      await prisma.order.update({
        where: { id },
        data: { deliveryId: delivery.id },
      });
      await prisma.orderAssignment.create({
        data: {
          orderId: id,
          courierId: data.courierId,
          assignedAt: new Date(),
          status: "ASSIGNED",
        },
      });
    }
  }

  async deleteOrder(id: string): Promise<void> {
    const cancelledStatus = await prisma.orderStatus.findFirst({
      where: { name: "CANCELLED" },
    });

    if (cancelledStatus) {
      await prisma.order.update({
        where: { id },
        data: { statusId: cancelledStatus.id, updatedAt: new Date() },
      });
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          statusId: cancelledStatus.id,
          changedAt: new Date(),
        },
      });
    }
  }
}
