import {
  PaginationParams,
  PaginatedResponse,
} from "../../../../shared/utils/pagination";

export type OrderPaymentStatus =
  | "NOT_INVOICED"
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID";

export interface OrderFinancialSummary {
  hasInvoice: boolean;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  paymentStatus: OrderPaymentStatus;
  totalInvoiced: number;
  totalPaid: number;
  pendingAmount: number;
  isFullyPaid: boolean;
}

export interface OrderListItem {
  id: string;
  restaurantName: string;
  customerName: string;
  riderName: string | null;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  financial: OrderFinancialSummary;
  createdAt: Date;
}

export interface OrderDetail {
  id: string;
  restaurant: { id: string; name: string };
  customer: { id: string; name: string; email: string };
  rider: { id: string; name: string } | null;
  status: string;
  priority: string | null;
  totalAmount: number;
  deliveryFee: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    note: string | null;
  }[];
  statusHistory: { status: string; changedAt: Date }[];
  incidents: {
    id: string;
    type: string;
    description: string;
    status: string;
    createdAt: Date;
  }[];
  financial: OrderFinancialSummary;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface OrdersKpis {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
  averageTicket: number;
}

export interface OrderFilters {
  status?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface IOrdersRepository {
  getKpis(): Promise<OrdersKpis>;
  getOrders(
    filters: OrderFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<OrderListItem>>;
  getOrderById(id: string): Promise<OrderDetail | null>;
  createOrder(data: {
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
  }): Promise<{ id: string; invoiceId: string; invoiceNumber: string }>;
  updateOrder(
    id: string,
    data: { statusId?: string; priorityId?: string; courierId?: string },
  ): Promise<void>;
  deleteOrder(id: string): Promise<void>;
}
