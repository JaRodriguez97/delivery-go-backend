import { prisma } from "../../../../shared/config/database";
import { Prisma } from "@prisma/client";
import {
  IOrdersRepository,
  OrderListItem,
  OrderDetail,
  OrdersKpis,
  OrderFilters,
  OrderFinancialSummary,
} from "../../domain/repositories/orders.repository";
import {
  PaginationParams,
  PaginatedResponse,
  paginatedResponse,
} from "../../../../shared/utils/pagination";

export class PrismaOrdersRepository implements IOrdersRepository {
  private readonly paidStatuses = [
    "COMPLETED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
  ] as const;

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private calculateEffectivePaid(
    payments: {
      status: string;
      amount: Prisma.Decimal;
      refunds: { amount: Prisma.Decimal; status: string }[];
    }[],
  ): number {
    return payments.reduce((acc, payment) => {
      if (
        !this.paidStatuses.includes(
          payment.status as (typeof this.paidStatuses)[number],
        )
      ) {
        return acc;
      }

      const paidAmount = Number(payment.amount);
      const refundedAmount = payment.refunds
        .filter((refund) => refund.status === "PROCESSED")
        .reduce((refundAcc, refund) => refundAcc + Number(refund.amount), 0);

      return acc + Math.max(0, paidAmount - refundedAmount);
    }, 0);
  }

  private buildFinancialSummary(
    invoice: {
      id: string;
      invoiceNumber: string;
      status: string;
      totalAmount: Prisma.Decimal;
      payments: {
        status: string;
        amount: Prisma.Decimal;
        refunds: { amount: Prisma.Decimal; status: string }[];
      }[];
    } | null,
  ): OrderFinancialSummary {
    if (!invoice) {
      return {
        hasInvoice: false,
        invoiceId: null,
        invoiceNumber: null,
        invoiceStatus: null,
        paymentStatus: "NOT_INVOICED",
        totalInvoiced: 0,
        totalPaid: 0,
        pendingAmount: 0,
        isFullyPaid: false,
      };
    }

    const totalInvoiced = Number(invoice.totalAmount);
    const totalPaid = this.roundCurrency(
      this.calculateEffectivePaid(invoice.payments),
    );
    const pendingAmount = this.roundCurrency(
      Math.max(0, totalInvoiced - totalPaid),
    );

    const paymentStatus: OrderFinancialSummary["paymentStatus"] =
      pendingAmount <= 0.001
        ? "PAID"
        : totalPaid > 0
          ? "PARTIALLY_PAID"
          : "UNPAID";

    return {
      hasInvoice: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceStatus: invoice.status,
      paymentStatus,
      totalInvoiced: this.roundCurrency(totalInvoiced),
      totalPaid,
      pendingAmount,
      isFullyPaid: pendingAmount <= 0.001,
    };
  }

  private async getOrCreateInvoiceSetup(
    tx: Prisma.TransactionClient,
    now: Date,
  ): Promise<{ invoiceTypeId: string; invoiceSequenceId: string }> {
    let invoiceType = await tx.invoiceType.findFirst({
      where: { code: "DELIVERY_FEE", status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (!invoiceType) {
      invoiceType = await tx.invoiceType.create({
        data: {
          code: "DELIVERY_FEE",
          name: "Tarifa de entrega",
          description: "Factura generada para pedidos de domicilio",
          status: "ACTIVE",
          createdAt: now,
        },
      });
    }

    let businessEntity = await tx.businessEntity.findUnique({
      where: { documentNumber: "900999000-1" },
    });

    if (!businessEntity) {
      businessEntity = await tx.businessEntity.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!businessEntity) {
      businessEntity = await tx.businessEntity.create({
        data: {
          legalName: "Delivery GO SAS",
          tradeName: "Delivery GO",
          documentType: "NIT",
          documentNumber: "900999000-1",
          status: "ACTIVE",
          createdAt: now,
        },
      });
    }

    let sequence = await tx.invoiceSequence.findFirst({
      where: {
        businessEntityId: businessEntity.id,
        invoiceTypeId: invoiceType.id,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "asc" },
    });

    if (!sequence) {
      sequence = await tx.invoiceSequence.create({
        data: {
          businessEntityId: businessEntity.id,
          invoiceTypeId: invoiceType.id,
          prefix: "DOM",
          currentNumber: 0,
          status: "ACTIVE",
          createdAt: now,
        },
      });
    }

    return {
      invoiceTypeId: invoiceType.id,
      invoiceSequenceId: sequence.id,
    };
  }

  private async nextInvoiceNumber(
    tx: Prisma.TransactionClient,
    invoiceSequenceId: string,
    now: Date,
  ): Promise<string> {
    const sequence = await tx.invoiceSequence.update({
      where: { id: invoiceSequenceId },
      data: {
        currentNumber: { increment: 1 },
        updatedAt: now,
      },
      select: {
        prefix: true,
        currentNumber: true,
      },
    });

    const nextNumber = sequence.currentNumber.toString().padStart(8, "0");
    return `${sequence.prefix}-${nextNumber}`;
  }

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
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              totalAmount: true,
              payments: {
                where: { deletedAt: null },
                select: {
                  status: true,
                  amount: true,
                  refunds: {
                    where: { status: "PROCESSED" },
                    select: { amount: true, status: true },
                  },
                },
              },
            },
          },
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
      financial: this.buildFinancialSummary(o.invoice),
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
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            payments: {
              where: { deletedAt: null },
              select: {
                status: true,
                amount: true,
                refunds: {
                  where: { status: "PROCESSED" },
                  select: { amount: true, status: true },
                },
              },
            },
          },
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
      financial: this.buildFinancialSummary(o.invoice),
      createdAt: o.createdAt ?? new Date(),
      updatedAt: o.updatedAt ?? null,
    };
  }

  async getAvailableOrders(courierId: string): Promise<OrderListItem[]> {
    const oneMinuteAgo = new Date(Date.now() - 60_000);

    const orders = await prisma.order.findMany({
      where: {
        status: { name: "PENDING" },
        assignments: {
          none: {
            courierId,
            OR: [
              { status: "ACCEPTED" },
              { status: "OFFERED", assignedAt: { gt: oneMinuteAgo } },
              { status: "REJECTED", rejectedAt: { gt: oneMinuteAgo } },
            ],
          },
        },
      },
      include: {
        customer: { include: { profile: true } },
        restaurant: { include: { profile: true } },
        status: true,
        delivery: { include: { courier: { include: { profile: true } } } },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            payments: {
              where: { deletedAt: null },
              select: {
                status: true,
                amount: true,
                refunds: {
                  where: { status: "PROCESSED" },
                  select: { amount: true, status: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const offeredAt = new Date();
    await prisma.$transaction(
      orders.map((order) =>
        prisma.orderAssignment.create({
          data: {
            orderId: order.id,
            courierId,
            status: "OFFERED",
            assignedAt: offeredAt,
          },
        }),
      ),
    );

    return orders.map((o) => ({
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
      financial: this.buildFinancialSummary(o.invoice),
      createdAt: o.createdAt ?? new Date(),
    }));
  }

  async createOrder(data: {
    restaurantId?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    priorityId?: string;
    deliveryFee?: number;
    items: {
      name: string;
      quantity: number;
      unitPrice: number;
      note?: string;
    }[];
  }): Promise<{ id: string; invoiceId: string; invoiceNumber: string }> {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      let customerId = data.customerId;

      if (!customerId) {
        const [firstName, ...lastNames] = (data.customerName ?? "Cliente Web")
          .trim()
          .split(" ")
          .filter(Boolean);
        const lastName = lastNames.join(" ") || "Generico";
        const syntheticEmail = `cliente-${Date.now()}@deliverygo.local`;

        const user = await tx.user.create({
          data: {
            email: syntheticEmail,
            passwordHash: "TEMPORAL_NO_LOGIN",
            status: "ACTIVE",
            emailVerified: false,
            accountLocked: false,
            createdAt: now,
          },
        });

        const profile = await tx.customerProfile.create({
          data: {
            firstName,
            lastName,
            phone: data.customerPhone,
            email: syntheticEmail,
            createdAt: now,
          },
        });

        const customer = await tx.customer.create({
          data: {
            userId: user.id,
            profileId: profile.id,
            createdAt: now,
          },
        });

        customerId = customer.id;
      }

      const subtotal = this.roundCurrency(
        data.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      );
      const deliveryFee = this.roundCurrency(data.deliveryFee ?? 0);
      const invoiceTotal = this.roundCurrency(subtotal + deliveryFee);

      const pendingStatus = await tx.orderStatus.findFirst({
        where: { name: "PENDING" },
      });

      if (!data.restaurantId) {
        throw new Error(
          "No se pudo determinar el restaurante para crear el pedido",
        );
      }

      const order = await tx.order.create({
        data: {
          restaurantId: data.restaurantId,
          customerId,
          statusId: pendingStatus?.id,
          priorityId: data.priorityId,
          totalAmount: subtotal,
          deliveryFee,
          createdAt: now,
          items: {
            create: data.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: this.roundCurrency(i.unitPrice * i.quantity),
              note: i.note,
            })),
          },
        },
      });

      if (pendingStatus) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            statusId: pendingStatus.id,
            changedAt: now,
          },
        });
      }

      const [{ invoiceTypeId, invoiceSequenceId }, customer] =
        await Promise.all([
          this.getOrCreateInvoiceSetup(tx, now),
          tx.customer.findUnique({
            where: { id: customerId },
            select: { userId: true },
          }),
        ]);

      const invoiceNumber = await this.nextInvoiceNumber(
        tx,
        invoiceSequenceId,
        now,
      );

      const invoiceItems = data.items.map((item, index) => {
        const lineSubtotal = this.roundCurrency(item.unitPrice * item.quantity);
        return {
          description: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotalAmount: lineSubtotal,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: lineSubtotal,
          sortOrder: index + 1,
          createdAt: now,
        };
      });

      if (deliveryFee > 0) {
        invoiceItems.push({
          description: "Costo de envio",
          quantity: 1,
          unitPrice: deliveryFee,
          subtotalAmount: deliveryFee,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: deliveryFee,
          sortOrder: invoiceItems.length + 1,
          createdAt: now,
        });
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceSequenceId,
          invoiceNumber,
          invoiceTypeId,
          userId: customer?.userId,
          orderId: order.id,
          currency: "COP",
          subtotalAmount: invoiceTotal,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: invoiceTotal,
          status: "ISSUED",
          issuedAt: now,
          notes: `Factura automatica generada para pedido ${order.id}`,
          createdAt: now,
          items: {
            create: invoiceItems,
          },
        },
      });

      return {
        id: order.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      };
    });
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

  async acceptAssignment(orderId: string, courierId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: { select: { name: true } } },
      });

      if (!order) {
        throw new Error("Pedido no encontrado");
      }

      if (order.status?.name !== "PENDING") {
        throw new Error("El pedido ya no está disponible");
      }

      const confirmedStatus = await tx.orderStatus.findFirst({
        where: { name: "CONFIRMED" },
        select: { id: true },
      });

      const delivery = await tx.delivery.create({
        data: {
          orderId,
          courierId,
          status: "ASSIGNED",
          startedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryId: delivery.id,
          statusId: confirmedStatus?.id,
          updatedAt: new Date(),
        },
      });

      if (confirmedStatus?.id) {
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            statusId: confirmedStatus.id,
            changedAt: new Date(),
          },
        });
      }

      await tx.orderAssignment.create({
        data: {
          orderId,
          courierId,
          assignedAt: new Date(),
          acceptedAt: new Date(),
          status: "ACCEPTED",
        },
      });
    });
  }

  async rejectAssignment(orderId: string, courierId: string): Promise<void> {
    await prisma.orderAssignment.create({
      data: {
        orderId,
        courierId,
        assignedAt: new Date(),
        rejectedAt: new Date(),
        status: "REJECTED",
      },
    });
  }

  async updateDeliveryStatus(orderId: string, status: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { deliveryId: true },
    });

    if (!order?.deliveryId) {
      throw new Error("El pedido no tiene entrega activa");
    }

    await prisma.delivery.update({
      where: { id: order.deliveryId },
      data: {
        status,
        completedAt: status === "DELIVERED" ? new Date() : undefined,
      },
    });
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
