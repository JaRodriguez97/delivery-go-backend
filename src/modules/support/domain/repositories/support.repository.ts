export interface TicketListItem {
  id: string;
  ticketNumber: string;
  subject: string | null;
  category: string;
  categoryLabel: string;
  priority: "high" | "medium" | "low";
  status: string | null;
  userName: string | null;
  userRole: string | null;
  latestMessage: string | null;
  orderId: string | null;
  createdAt: Date | null;
  closedAt: Date | null;
  eventsCount: number;
}

export interface TicketDetail extends TicketListItem {
  events: {
    id: string;
    eventType: string | null;
    message: string | null;
    createdBy: string | null;
    createdAt: Date | null;
  }[];
}

export interface SupportKpis {
  open: number;
  inProgress: number;
  closed: number;
  avgResolutionHours: number;
  closedToday: number;
  recurrentIssueLabel: string | null;
}

export interface SupportAlertItem {
  id: string;
  ticketNumber: string;
  title: string;
  subtitle: string;
  priority: "high" | "medium" | "low";
  createdAt: Date | null;
}

export interface SupportBreakdownItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
}

export interface SupportFilterOption {
  value: string;
  label: string;
}

export interface SupportDashboardResponse {
  kpis: SupportKpis;
  alerts: SupportAlertItem[];
  incidentBreakdown: SupportBreakdownItem[];
  typeOptions: SupportFilterOption[];
  statusOptions: SupportFilterOption[];
  data: TicketListItem[];
  total: number;
}

export interface TicketFilters {
  search?: string;
  status?: string;
  type?: string;
  createdDate?: Date;
}

export interface ISupportRepository {
  getKpis(): Promise<SupportKpis>;
  getTickets(
    filters: TicketFilters,
    pagination: { skip: number; limit: number },
  ): Promise<{ data: TicketListItem[]; total: number }>;
  getDashboard(
    filters: TicketFilters,
    pagination: { skip: number; limit: number },
  ): Promise<SupportDashboardResponse>;
  getTicketById(id: string): Promise<TicketDetail | null>;
  createTicket(
    data: { subject: string; description: string; orderId?: string },
    userId: string,
  ): Promise<{ id: string }>;
  closeTicket(id: string, resolution: string, userId: string): Promise<void>;
  addComment(
    ticketId: string,
    comment: string,
    userId: string,
  ): Promise<{ id: string }>;
  updateStatus(id: string, status: string, userId: string): Promise<void>;
}
