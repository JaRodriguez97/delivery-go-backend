export interface TicketListItem {
  id: string;
  subject: string | null;
  status: string | null;
  userName: string | null;
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
}

export interface TicketFilters {
  search?: string;
  status?: string;
}

export interface ISupportRepository {
  getKpis(): Promise<SupportKpis>;
  getTickets(
    filters: TicketFilters,
    pagination: { skip: number; limit: number },
  ): Promise<{ data: TicketListItem[]; total: number }>;
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
}
