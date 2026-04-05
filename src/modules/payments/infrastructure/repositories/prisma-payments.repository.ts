import { prisma } from "../../../../shared/config/database";
import {
  IPaymentsRepository,
  PaymentListItem,
  PaymentDetail,
  PaymentsKpis,
  PaymentFilters,
  InvoiceListItem,
} from "../../domain/repositories/payments.repository";

export class PrismaPaymentsRepository implements IPaymentsRepository {
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
    const where: any = { deletedAt: null };

    if (filters.status) where.status = filters.status;
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

  async processPayment(data: {
    invoiceId: string;
    paymentMethodId: string;
    amount: number;
    currency?: string;
    externalReference?: string;
    notes?: string;
  }): Promise<{ id: string; paymentNumber: string }> {
    const count = await prisma.payment.count();
    const paymentNumber = `PAY-${String(count + 1).padStart(6, "0")}`;

    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        invoiceId: data.invoiceId,
        paymentMethodId: data.paymentMethodId,
        amount: data.amount,
        currency: data.currency ?? "COP",
        externalReference: data.externalReference,
        notes: data.notes,
        status: "PENDING",
        createdAt: new Date(),
      },
    });

    return { id: payment.id, paymentNumber: payment.paymentNumber };
  }

  async refundPayment(
    paymentId: string,
    data: { amount: number; reason?: string },
    userId?: string,
  ): Promise<{ id: string; refundNumber: string }> {
    const count = await prisma.refund.count();
    const refundNumber = `REF-${String(count + 1).padStart(6, "0")}`;

    const refund = await prisma.refund.create({
      data: {
        paymentId,
        refundNumber,
        amount: data.amount,
        reason: data.reason,
        status: "PENDING",
        createdBy: userId,
        createdAt: new Date(),
      },
    });

    return { id: refund.id, refundNumber: refund.refundNumber };
  }

  async getInvoices(pagination: {
    skip: number;
    limit: number;
  }): Promise<{ data: InvoiceListItem[]; total: number }> {
    const where = { deletedAt: null };

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
