import { prisma } from "../../../../shared/config/database";
import {
  IPaymentsRepository,
  PaymentListItem,
  PaymentDetail,
  PaymentsKpis,
  PaymentsDashboardKpis,
  PaymentFilters,
  InvoiceListItem,
  PaymentMethodListItem,
  PaymentTransactionItem,
  PaymentsDashboardResponse,
} from "../../domain/repositories/payments.repository";
import { Prisma } from "@prisma/client";

export class PrismaPaymentsRepository implements IPaymentsRepository {
  private readonly platformCommissionRate = 0.15;
  private readonly removedMethodCodes = [
    "BANK_TRANSFER",
    "NEQUI",
    "DAVIPLATA",
  ] as const;
  private readonly paidStatuses = [
    "COMPLETED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
  ] as const;

  private buildReference(prefix: "PAY" | "REF"): string {
    const timestamp = Date.now().toString().slice(-8);
    const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${timestamp}${randomSuffix}`;
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

  private getInvoiceStatusFromEffectivePaid(
    effectivePaid: number,
    invoiceTotal: number,
  ): "ISSUED" | "PARTIALLY_PAID" | "PAID" {
    if (effectivePaid <= 0) {
      return "ISSUED";
    }

    if (effectivePaid >= invoiceTotal - 0.001) {
      return "PAID";
    }

    return "PARTIALLY_PAID";
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private buildDashboardCollection<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ) {
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
    };
  }

  private async getSettlementKpis(): Promise<
    Pick<
      PaymentsDashboardKpis,
      | "ridersPendingAmount"
      | "restaurantsPendingAmount"
      | "platformCommissionAmount"
      | "deliveredOrders"
    >
  > {
    const orders = await prisma.order.findMany({
      select: {
        totalAmount: true,
        deliveryFee: true,
        status: {
          select: {
            name: true,
          },
        },
      },
    });

    const deliveredOrders = orders.filter(
      (order) => (order.status?.name ?? "").toUpperCase() === "DELIVERED",
    );

    let ridersPendingAmount = 0;
    let restaurantsPendingAmount = 0;
    let platformCommissionAmount = 0;

    for (const order of deliveredOrders) {
      const restaurantGross = Number(order.totalAmount ?? 0);
      const riderAmount = Number(order.deliveryFee ?? 0);
      const platformCommission = this.roundCurrency(
        restaurantGross * this.platformCommissionRate,
      );
      const restaurantNet = Math.max(
        0,
        this.roundCurrency(restaurantGross - platformCommission),
      );

      ridersPendingAmount += riderAmount;
      restaurantsPendingAmount += restaurantNet;
      platformCommissionAmount += platformCommission;
    }

    return {
      ridersPendingAmount: this.roundCurrency(ridersPendingAmount),
      restaurantsPendingAmount: this.roundCurrency(restaurantsPendingAmount),
      platformCommissionAmount: this.roundCurrency(platformCommissionAmount),
      deliveredOrders: deliveredOrders.length,
    };
  }

  private async getDetailedTransactions(
    filters: PaymentFilters,
    pagination: { page: number; limit: number },
  ): Promise<{ data: PaymentTransactionItem[]; total: number }> {
    const where: Prisma.PaymentWhereInput = { deletedAt: null };

    if (filters.status) {
      const normalizedStatus = filters.status.toUpperCase();
      const allowedStatuses = [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
      ] as const;

      if (
        allowedStatuses.includes(
          normalizedStatus as (typeof allowedStatuses)[number],
        )
      ) {
        where.status = normalizedStatus as (typeof allowedStatuses)[number];
      }
    }

    if (filters.paymentMethodId) {
      where.paymentMethodId = filters.paymentMethodId;
    }

    if (filters.search) {
      where.OR = [
        { paymentNumber: { contains: filters.search, mode: "insensitive" } },
        {
          invoice: {
            invoiceNumber: { contains: filters.search, mode: "insensitive" },
          },
        },
        {
          invoice: {
            party: {
              is: {
                fullName: { contains: filters.search, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    const itemsToFetch =
      Math.max(1, pagination.page) * Math.max(1, pagination.limit);

    const [paymentTotal, refundTotal, payments, refunds] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.refund.count({
        where: {
          payment: where,
        },
      }),
      prisma.payment.findMany({
        where,
        take: itemsToFetch,
        orderBy: { createdAt: "desc" },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              party: {
                select: {
                  fullName: true,
                },
              },
            },
          },
        },
      }),
      prisma.refund.findMany({
        where: {
          payment: where,
        },
        take: itemsToFetch,
        orderBy: { processedAt: "desc" },
        include: {
          payment: {
            include: {
              invoice: {
                select: {
                  invoiceNumber: true,
                  party: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const paymentItems: PaymentTransactionItem[] = payments.map((payment) => ({
      id: `payment-${payment.id}`,
      reference: payment.paymentNumber,
      concept:
        payment.status === "PENDING" || payment.status === "PROCESSING"
          ? "Pago pendiente de confirmacion"
          : "Pago recibido",
      beneficiary:
        payment.invoice.party?.fullName ??
        `Factura ${payment.invoice.invoiceNumber}`,
      type: "Entrada",
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      occurredAt: payment.paidAt ?? payment.createdAt,
    }));

    const refundItems: PaymentTransactionItem[] = refunds.map((refund) => ({
      id: `refund-${refund.id}`,
      reference: refund.refundNumber,
      concept: refund.reason?.trim() || "Reembolso procesado",
      beneficiary:
        refund.payment.invoice.party?.fullName ??
        `Factura ${refund.payment.invoice.invoiceNumber}`,
      type: "Salida",
      amount: Number(refund.amount),
      currency: refund.payment.currency,
      status: refund.status,
      occurredAt: refund.processedAt ?? refund.createdAt,
    }));

    const combined = [...paymentItems, ...refundItems]
      .sort((a, b) => {
        const aTime = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
        const bTime = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(
        (pagination.page - 1) * pagination.limit,
        pagination.page * pagination.limit,
      );

    return {
      data: combined,
      total: paymentTotal + refundTotal,
    };
  }

  async getDashboard(
    filters: PaymentFilters,
    pagination: { page: number; skip: number; limit: number },
  ): Promise<PaymentsDashboardResponse> {
    const paymentsLimit = 50;
    const invoicesLimit = 30;

    const [
      kpis,
      settlementKpis,
      payments,
      invoices,
      paymentMethods,
      transactions,
    ] = await Promise.all([
      this.getKpis(),
      this.getSettlementKpis(),
      this.getPayments(filters, { skip: 0, limit: paymentsLimit }),
      this.getInvoices({ skip: 0, limit: invoicesLimit }),
      this.getPaymentMethods(),
      this.getDetailedTransactions(filters, {
        page: pagination.page,
        limit: pagination.limit,
      }),
    ]);

    return {
      kpis: {
        ...kpis,
        ...settlementKpis,
      },
      payments: this.buildDashboardCollection(
        payments.data,
        payments.total,
        1,
        paymentsLimit,
      ),
      invoices: this.buildDashboardCollection(
        invoices.data,
        invoices.total,
        1,
        invoicesLimit,
      ),
      paymentMethods,
      transactions: this.buildDashboardCollection(
        transactions.data,
        transactions.total,
        pagination.page,
        pagination.limit,
      ),
    };
  }

  async getKpis(): Promise<PaymentsKpis> {
    const [totalPayments, totals] = await Promise.all([
      prisma.payment.count({ where: { deletedAt: null } }),
      prisma.payment.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    let totalAmount = 0;
    let pendingAmount = 0;
    let refundedAmount = 0;

    for (const g of totals) {
      const sum = Number(g._sum.amount ?? 0);
      totalAmount += sum;
      if (g.status === "PENDING") pendingAmount += sum;
      if (g.status === "REFUNDED") refundedAmount += sum;
    }

    return { totalPayments, totalAmount, pendingAmount, refundedAmount };
  }

  async getPayments(
    filters: PaymentFilters,
    pagination: { skip: number; limit: number },
  ): Promise<{ data: PaymentListItem[]; total: number }> {
    const where: Prisma.PaymentWhereInput = { deletedAt: null };

    if (filters.status) {
      const normalizedStatus = filters.status.toUpperCase();
      const allowedStatuses = [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
      ] as const;

      if (
        allowedStatuses.includes(
          normalizedStatus as (typeof allowedStatuses)[number],
        )
      ) {
        where.status = normalizedStatus as (typeof allowedStatuses)[number];
      }
    }
    if (filters.paymentMethodId)
      where.paymentMethodId = filters.paymentMethodId;
    if (filters.search) {
      where.OR = [
        { paymentNumber: { contains: filters.search, mode: "insensitive" } },
        {
          invoice: {
            invoiceNumber: { contains: filters.search, mode: "insensitive" },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          invoice: { select: { invoiceNumber: true } },
          paymentMethod: { select: { name: true } },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data: data.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        invoiceNumber: p.invoice.invoiceNumber,
        paymentMethod: p.paymentMethod.name,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
      total,
    };
  }

  async getPaymentById(id: string): Promise<PaymentDetail | null> {
    const p = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: { select: { invoiceNumber: true } },
        paymentMethod: { select: { name: true } },
        refunds: true,
      },
    });

    if (!p) return null;

    return {
      id: p.id,
      paymentNumber: p.paymentNumber,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoice.invoiceNumber,
      paymentMethod: p.paymentMethod.name,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      externalReference: p.externalReference,
      notes: p.notes,
      refunds: p.refunds.map((r) => ({
        id: r.id,
        refundNumber: r.refundNumber,
        amount: Number(r.amount),
        reason: r.reason,
        status: r.status,
        processedAt: r.processedAt,
      })),
    };
  }

  async getPaymentMethods(): Promise<PaymentMethodListItem[]> {
    const methods = await prisma.paymentMethod.findMany({
      where: {
        status: "ACTIVE",
        code: {
          notIn: [...this.removedMethodCodes],
        },
      },
      orderBy: { name: "asc" },
    });

    return methods.map((method) => ({
      id: method.id,
      code: method.code,
      name: method.name,
      methodType: method.methodType,
      requiresGateway: method.requiresGateway,
      allowsInstallments: method.allowsInstallments,
    }));
  }

  async processPayment(data: {
    invoiceId: string;
    paymentMethodId: string;
    amount: number;
    currency?: string;
    externalReference?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<{
    id: string;
    paymentNumber: string;
    status: string;
    paidAt: Date | null;
  }> {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: {
          payments: {
            where: { deletedAt: null },
            include: {
              refunds: {
                where: { status: "PROCESSED" },
              },
            },
          },
        },
      });

      if (!invoice) {
        throw new Error("Factura no encontrada");
      }

      if (invoice.status === "CANCELLED" || invoice.status === "VOIDED") {
        throw new Error("La factura no permite recibir pagos");
      }

      const paymentMethod = await tx.paymentMethod.findUnique({
        where: { id: data.paymentMethodId },
      });

      if (!paymentMethod || paymentMethod.status !== "ACTIVE") {
        throw new Error("Método de pago inválido o inactivo");
      }

      if (
        this.removedMethodCodes.includes(
          paymentMethod.code as (typeof this.removedMethodCodes)[number],
        )
      ) {
        throw new Error(
          "Método de pago no disponible. Usa PSE para pagos en línea",
        );
      }

      const effectivePaid = this.calculateEffectivePaid(invoice.payments);
      const invoiceTotal = Number(invoice.totalAmount);
      const pendingAmount = Math.max(
        0,
        Math.round((invoiceTotal - effectivePaid) * 100) / 100,
      );

      if (data.amount > pendingAmount + 0.001) {
        throw new Error("El monto excede el saldo pendiente de la factura");
      }

      const now = new Date();
      const paymentNumber = this.buildReference("PAY");
      const status =
        paymentMethod.methodType === "CASH" ? "COMPLETED" : "PENDING";
      const paidAt = status === "COMPLETED" ? now : null;

      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: data.invoiceId,
          paymentMethodId: data.paymentMethodId,
          amount: data.amount,
          currency: data.currency ?? "COP",
          externalReference: data.externalReference,
          notes: data.notes,
          status,
          paidAt,
          createdBy: data.createdBy,
          createdAt: now,
        },
      });

      await tx.paymentApplication.create({
        data: {
          paymentId: payment.id,
          invoiceId: data.invoiceId,
          appliedAmount: data.amount,
          createdAt: now,
        },
      });

      if (status === "COMPLETED") {
        const updatedPaid = effectivePaid + data.amount;
        const nextInvoiceStatus = this.getInvoiceStatusFromEffectivePaid(
          updatedPaid,
          invoiceTotal,
        );

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: nextInvoiceStatus,
            updatedAt: now,
          },
        });
      } else if (invoice.status === "DRAFT") {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "ISSUED",
            updatedAt: now,
          },
        });
      }

      return {
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        status: payment.status,
        paidAt: payment.paidAt,
      };
    });
  }

  async completePayment(
    paymentId: string,
    userId?: string,
  ): Promise<{
    id: string;
    paymentNumber: string;
    status: string;
    paidAt: Date | null;
  }> {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          invoice: true,
        },
      });

      if (!payment) {
        throw new Error("Pago no encontrado");
      }

      if (payment.status !== "PENDING" && payment.status !== "PROCESSING") {
        throw new Error(
          "El pago solo se puede completar desde estado pendiente",
        );
      }

      const now = new Date();
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "COMPLETED",
          paidAt: now,
          updatedAt: now,
          ...(userId && !payment.createdBy ? { createdBy: userId } : {}),
        },
      });

      const invoicePayments = await tx.payment.findMany({
        where: {
          invoiceId: payment.invoiceId,
          deletedAt: null,
        },
        include: {
          refunds: {
            where: { status: "PROCESSED" },
          },
        },
      });

      const effectivePaid = this.calculateEffectivePaid(invoicePayments);
      const invoiceTotal = Number(payment.invoice.totalAmount);
      const nextInvoiceStatus = this.getInvoiceStatusFromEffectivePaid(
        effectivePaid,
        invoiceTotal,
      );

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: nextInvoiceStatus,
          updatedAt: now,
        },
      });

      return {
        id: updatedPayment.id,
        paymentNumber: updatedPayment.paymentNumber,
        status: updatedPayment.status,
        paidAt: updatedPayment.paidAt,
      };
    });
  }

  async refundPayment(
    paymentId: string,
    data: { amount: number; reason?: string },
    userId?: string,
  ): Promise<{ id: string; refundNumber: string; status: string }> {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          refunds: {
            where: {
              status: "PROCESSED",
            },
          },
          invoice: true,
        },
      });

      if (!payment) {
        throw new Error("Pago no encontrado");
      }

      if (
        !this.paidStatuses.includes(
          payment.status as (typeof this.paidStatuses)[number],
        )
      ) {
        throw new Error("Solo se puede reembolsar un pago completado");
      }

      const refundedSoFar = payment.refunds.reduce(
        (acc, refund) => acc + Number(refund.amount),
        0,
      );
      const paymentAmount = Number(payment.amount);
      const availableToRefund = Math.max(0, paymentAmount - refundedSoFar);

      if (data.amount > availableToRefund + 0.001) {
        throw new Error("El monto del reembolso excede el saldo disponible");
      }

      const now = new Date();
      const refundNumber = this.buildReference("REF");

      const refund = await tx.refund.create({
        data: {
          paymentId,
          refundNumber,
          amount: data.amount,
          reason: data.reason,
          status: "PROCESSED",
          processedAt: now,
          createdBy: userId,
          createdAt: now,
        },
      });

      const refundedAfter = refundedSoFar + data.amount;
      const paymentStatus =
        refundedAfter >= paymentAmount - 0.001
          ? "REFUNDED"
          : "PARTIALLY_REFUNDED";

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: paymentStatus,
          updatedAt: now,
        },
      });

      const invoicePayments = await tx.payment.findMany({
        where: {
          invoiceId: payment.invoiceId,
          deletedAt: null,
        },
        include: {
          refunds: {
            where: { status: "PROCESSED" },
          },
        },
      });

      const effectivePaid = this.calculateEffectivePaid(invoicePayments);
      const invoiceTotal = Number(payment.invoice.totalAmount);
      const nextInvoiceStatus = this.getInvoiceStatusFromEffectivePaid(
        effectivePaid,
        invoiceTotal,
      );

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: nextInvoiceStatus,
          updatedAt: now,
        },
      });

      return {
        id: refund.id,
        refundNumber: refund.refundNumber,
        status: refund.status,
      };
    });
  }

  async getInvoices(pagination: {
    skip: number;
    limit: number;
  }): Promise<{ data: InvoiceListItem[]; total: number }> {
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      status: {
        in: ["DRAFT", "ISSUED", "PARTIALLY_PAID"],
      },
    };

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      data: data.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        totalAmount: Number(i.totalAmount),
        currency: i.currency,
        status: i.status,
        issuedAt: i.issuedAt,
        dueDate: i.dueDate,
      })),
      total,
    };
  }
}
