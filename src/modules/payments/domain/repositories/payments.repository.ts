export interface PaymentListItem {
  id: string;
  paymentNumber: string;
  invoiceNumber: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
}

export interface PaymentDetail extends PaymentListItem {
  invoiceId: string;
  externalReference: string | null;
  notes: string | null;
  refunds: {
    id: string;
    refundNumber: string;
    amount: number;
    reason: string | null;
    status: string;
    processedAt: Date | null;
  }[];
}

export interface PaymentsKpis {
  totalPayments: number;
  totalAmount: number;
  pendingAmount: number;
  refundedAmount: number;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  status: string;
  issuedAt: Date | null;
  dueDate: Date | null;
}

export interface PaymentFilters {
  search?: string;
  status?: string;
  paymentMethodId?: string;
}

export interface IPaymentsRepository {
  getKpis(): Promise<PaymentsKpis>;
  getPayments(
    filters: PaymentFilters,
    pagination: { skip: number; limit: number },
  ): Promise<{ data: PaymentListItem[]; total: number }>;
  getPaymentById(id: string): Promise<PaymentDetail | null>;
  processPayment(data: {
    invoiceId: string;
    paymentMethodId: string;
    amount: number;
    currency?: string;
    externalReference?: string;
    notes?: string;
  }): Promise<{ id: string; paymentNumber: string }>;
  refundPayment(
    paymentId: string,
    data: { amount: number; reason?: string },
    userId?: string,
  ): Promise<{ id: string; refundNumber: string }>;
  getInvoices(pagination: {
    skip: number;
    limit: number;
  }): Promise<{ data: InvoiceListItem[]; total: number }>;
}
