export interface PaymentListItem {
  id: string;
  paymentNumber: string;
  invoiceNumber: string;
  orderId: string | null;
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

export interface PaymentsDashboardKpis extends PaymentsKpis {
  ridersPendingAmount: number;
  restaurantsPendingAmount: number;
  platformCommissionAmount: number;
  platformCommissionPercent: number;
  deliveredOrders: number;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  orderId: string | null;
  totalAmount: number;
  currency: string;
  status: string;
  issuedAt: Date | null;
  dueDate: Date | null;
}

export interface PaymentMethodListItem {
  id: string;
  code: string;
  name: string;
  methodType: string;
  requiresGateway: boolean;
  allowsInstallments: boolean;
}

export interface PaymentTransactionItem {
  id: string;
  reference: string;
  orderId: string | null;
  concept: string;
  beneficiary: string;
  type: "Entrada" | "Salida";
  amount: number;
  currency: string;
  status: string;
  occurredAt: Date | null;
}

export interface PaymentsDashboardCollection<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentsDashboardResponse {
  kpis: PaymentsDashboardKpis;
  payments: PaymentsDashboardCollection<PaymentListItem>;
  invoices: PaymentsDashboardCollection<InvoiceListItem>;
  paymentMethods: PaymentMethodListItem[];
  transactions: PaymentsDashboardCollection<PaymentTransactionItem>;
}

export interface PaymentFilters {
  search?: string;
  status?: string;
  paymentMethodId?: string;
}

export interface IPaymentsRepository {
  getKpis(): Promise<PaymentsKpis>;
  getDashboard(
    filters: PaymentFilters,
    pagination: { page: number; skip: number; limit: number },
  ): Promise<PaymentsDashboardResponse>;
  getPayments(
    filters: PaymentFilters,
    pagination: { skip: number; limit: number },
  ): Promise<{ data: PaymentListItem[]; total: number }>;
  getPaymentById(id: string): Promise<PaymentDetail | null>;
  getPaymentMethods(): Promise<PaymentMethodListItem[]>;
  processPayment(data: {
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
  }>;
  completePayment(
    paymentId: string,
    userId?: string,
  ): Promise<{
    id: string;
    paymentNumber: string;
    status: string;
    paidAt: Date | null;
  }>;
  refundPayment(
    paymentId: string,
    data: { amount: number; reason?: string },
    userId?: string,
  ): Promise<{ id: string; refundNumber: string; status: string }>;
  getInvoices(pagination: {
    skip: number;
    limit: number;
  }): Promise<{ data: InvoiceListItem[]; total: number }>;
}
