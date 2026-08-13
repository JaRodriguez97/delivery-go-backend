import { prisma } from "../../../../shared/config/database";
import {
  ISupportRepository,
  TicketListItem,
  TicketDetail,
  SupportKpis,
  TicketFilters,
  SupportDashboardResponse,
  SupportAlertItem,
  SupportBreakdownItem,
  SupportFilterOption,
} from "../../domain/repositories/support.repository";

export class PrismaSupportRepository implements ISupportRepository {
  private readonly statusOptions: SupportFilterOption[] = [
    { value: "OPEN", label: "Abierto" },
    { value: "IN_PROGRESS", label: "En Proceso" },
    { value: "CLOSED", label: "Cerrado" },
    { value: "RESOLVED", label: "Resuelto" },
  ];

  private normalizeText(value: string | null | undefined): string {
    return (value ?? "").trim().toLowerCase();
  }

  private deriveCategoryKey(
    subject: string | null,
    eventType: string | null,
  ): string {
    const source = `${this.normalizeText(subject)} ${this.normalizeText(eventType)}`;

    if (
      source.includes("factur") ||
      source.includes("cobro") ||
      source.includes("pago") ||
      source.includes("billing")
    ) {
      return "billing";
    }

    if (
      source.includes("app") ||
      source.includes("error") ||
      source.includes("tecn") ||
      source.includes("login") ||
      source.includes("sistema")
    ) {
      return "technical";
    }

    if (
      source.includes("entrega") ||
      source.includes("rider") ||
      source.includes("repart") ||
      source.includes("domic") ||
      source.includes("envio")
    ) {
      return "delivery";
    }

    if (
      source.includes("restaura") ||
      source.includes("cocina") ||
      source.includes("menu") ||
      source.includes("pedido")
    ) {
      return "restaurant";
    }

    if (
      source.includes("cuenta") ||
      source.includes("perfil") ||
      source.includes("usuario") ||
      source.includes("acceso")
    ) {
      return "account";
    }

    return "general";
  }

  private getCategoryLabel(categoryKey: string): string {
    const labels: Record<string, string> = {
      delivery: "Entrega",
      billing: "Facturación",
      technical: "App/Técnico",
      restaurant: "Restaurante",
      account: "Cuenta",
      general: "General",
    };

    return labels[categoryKey] ?? "General";
  }

  private derivePriority(
    status: string | null,
    createdAt: Date | null,
    orderId: string | null,
  ): "high" | "medium" | "low" {
    const normalizedStatus = (status ?? "").toUpperCase();

    if (normalizedStatus === "OPEN" && orderId) {
      return "high";
    }

    if (normalizedStatus === "OPEN") {
      return "medium";
    }

    if (normalizedStatus === "IN_PROGRESS") {
      return createdAt && Date.now() - createdAt.getTime() <= 2 * 60 * 60 * 1000
        ? "high"
        : "medium";
    }

    return "low";
  }

  private formatTicketNumber(id: string): string {
    return `#TK-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  }

  private mapTicketRow(ticket: {
    id: string;
    subject: string | null;
    status: string | null;
    orderId: string | null;
    createdAt: Date | null;
    closedAt: Date | null;
    user: {
      profile: { firstName: string | null; lastName: string | null } | null;
      userRoles: { role: { name: string } }[];
    } | null;
    events: { eventType: string | null; message: string | null }[];
    _count: { events: number };
  }): TicketListItem {
    const latestEvent = ticket.events[0] ?? null;
    const category = this.deriveCategoryKey(
      ticket.subject,
      latestEvent?.eventType ?? null,
    );
    const userRole = ticket.user?.userRoles[0]?.role.name ?? null;

    return {
      id: ticket.id,
      ticketNumber: this.formatTicketNumber(ticket.id),
      subject: ticket.subject,
      category,
      categoryLabel: this.getCategoryLabel(category),
      priority: this.derivePriority(
        ticket.status,
        ticket.createdAt,
        ticket.orderId,
      ),
      status: ticket.status,
      userName: ticket.user?.profile
        ? `${ticket.user.profile.firstName ?? ""} ${ticket.user.profile.lastName ?? ""}`.trim() ||
          null
        : null,
      userRole,
      latestMessage: latestEvent?.message ?? null,
      orderId: ticket.orderId,
      createdAt: ticket.createdAt,
      closedAt: ticket.closedAt,
      eventsCount: ticket._count.events,
    };
  }

  private buildKpis(tickets: TicketListItem[]): SupportKpis {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const open = tickets.filter(
      (ticket) => (ticket.status ?? "").toUpperCase() === "OPEN",
    ).length;
    const inProgress = tickets.filter(
      (ticket) => (ticket.status ?? "").toUpperCase() === "IN_PROGRESS",
    ).length;
    const closedTickets = tickets.filter((ticket) => {
      const status = (ticket.status ?? "").toUpperCase();
      return status === "CLOSED" || status === "RESOLVED";
    });

    const closedToday = closedTickets.filter(
      (ticket) =>
        ticket.closedAt &&
        ticket.closedAt >= todayStart &&
        ticket.closedAt < todayEnd,
    ).length;

    const resolutionHours = closedTickets
      .filter((ticket) => ticket.createdAt && ticket.closedAt)
      .map(
        (ticket) =>
          (ticket.closedAt!.getTime() - ticket.createdAt!.getTime()) / 3600000,
      );

    const avgResolutionHours =
      resolutionHours.length > 0
        ? Math.round(
            (resolutionHours.reduce((sum, value) => sum + value, 0) /
              resolutionHours.length) *
              100,
          ) / 100
        : 0;

    const issueCounter = new Map<string, number>();
    for (const ticket of tickets) {
      const key = ticket.subject?.trim() || ticket.categoryLabel;
      issueCounter.set(key, (issueCounter.get(key) ?? 0) + 1);
    }

    let recurrentIssueLabel: string | null = null;
    let recurrentIssueCount = 0;
    for (const [label, count] of issueCounter.entries()) {
      if (count > recurrentIssueCount) {
        recurrentIssueLabel = label;
        recurrentIssueCount = count;
      }
    }

    return {
      open,
      inProgress,
      closed: closedTickets.length,
      avgResolutionHours,
      closedToday,
      recurrentIssueLabel,
    };
  }

  private buildAlerts(tickets: TicketListItem[]): SupportAlertItem[] {
    return tickets
      .filter((ticket) => {
        const status = (ticket.status ?? "").toUpperCase();
        return status === "OPEN" || status === "IN_PROGRESS";
      })
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 4)
      .map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.subject?.trim() || "Ticket sin asunto",
        subtitle: ticket.orderId
          ? `${ticket.ticketNumber} | Pedido ${ticket.orderId.slice(0, 8).toUpperCase()}`
          : `${ticket.ticketNumber} | ${ticket.userName ?? "Usuario sin identificar"}`,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
      }));
  }

  private buildIncidentBreakdown(
    tickets: TicketListItem[],
  ): SupportBreakdownItem[] {
    const counter = new Map<string, { label: string; count: number }>();

    for (const ticket of tickets) {
      const existing = counter.get(ticket.category) ?? {
        label: ticket.categoryLabel,
        count: 0,
      };
      existing.count += 1;
      counter.set(ticket.category, existing);
    }

    return Array.from(counter.entries())
      .map(([key, value]) => ({
        key,
        label: value.label,
        count: value.count,
        percentage:
          tickets.length > 0
            ? Math.round((value.count / tickets.length) * 100 * 100) / 100
            : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private buildTypeOptions(tickets: TicketListItem[]): SupportFilterOption[] {
    const unique = new Map<string, string>();
    for (const ticket of tickets) {
      unique.set(ticket.category, ticket.categoryLabel);
    }

    return Array.from(unique.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  async getKpis(): Promise<SupportKpis> {
    const allTickets = await prisma.supportTicket.findMany({
      include: {
        user: {
          include: {
            profile: true,
            userRoles: {
              where: { status: "ACTIVE" },
              include: { role: { select: { name: true } } },
              take: 1,
            },
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { events: true } },
      },
    });

    return this.buildKpis(
      allTickets.map((ticket) => this.mapTicketRow(ticket)),
    );
  }

  async getTickets(
    filters: TicketFilters,
    pagination: { skip: number; limit: number },
  ): Promise<{ data: TicketListItem[]; total: number }> {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.createdDate) {
      const start = new Date(filters.createdDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.createdDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const data = await prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          include: {
            profile: true,
            userRoles: {
              where: { status: "ACTIVE" },
              include: { role: { select: { name: true } } },
              take: 1,
            },
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { events: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const mappedData = data.map((ticket) => this.mapTicketRow(ticket));
    const filteredData = filters.type
      ? mappedData.filter((ticket) => ticket.category === filters.type)
      : mappedData;
    const total = filteredData.length;

    return {
      data: filteredData.slice(
        pagination.skip,
        pagination.skip + pagination.limit,
      ),
      total,
    };
  }

  async getDashboard(
    filters: TicketFilters,
    pagination: { skip: number; limit: number },
  ): Promise<SupportDashboardResponse> {
    const baseTickets = await this.getTickets(filters, {
      skip: 0,
      limit: Number.MAX_SAFE_INTEGER,
    });

    const pagedTickets = baseTickets.data.slice(
      pagination.skip,
      pagination.skip + pagination.limit,
    );

    return {
      kpis: this.buildKpis(baseTickets.data),
      alerts: this.buildAlerts(baseTickets.data),
      incidentBreakdown: this.buildIncidentBreakdown(baseTickets.data),
      typeOptions: this.buildTypeOptions(baseTickets.data),
      statusOptions: this.statusOptions,
      data: pagedTickets,
      total: baseTickets.total,
    };
  }

  async getTicketById(id: string): Promise<TicketDetail | null> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true,
            userRoles: {
              where: { status: "ACTIVE" },
              include: { role: { select: { name: true } } },
              take: 1,
            },
          },
        },
        events: { orderBy: { createdAt: "asc" } },
        _count: { select: { events: true } },
      },
    });

    if (!ticket) return null;

    const latestEvent = ticket.events[ticket.events.length - 1] ?? null;
    const mappedTicket = this.mapTicketRow({
      ...ticket,
      events: latestEvent ? [latestEvent] : [],
    });

    return {
      ...mappedTicket,
      events: ticket.events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        message: e.message,
        createdBy: e.createdBy,
        createdAt: e.createdAt,
      })),
    };
  }

  async createTicket(
    data: { subject: string; description: string; orderId?: string },
    userId: string,
  ): Promise<{ id: string }> {
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        orderId: data.orderId,
        subject: data.subject,
        status: "OPEN",
        createdAt: new Date(),
        events: {
          create: {
            eventType: "CREATED",
            message: data.description,
            createdBy: userId,
            createdAt: new Date(),
          },
        },
      },
    });
    return { id: ticket.id };
  }

  async closeTicket(
    id: string,
    resolution: string,
    userId: string,
  ): Promise<void> {
    await prisma.$transaction([
      prisma.supportTicket.update({
        where: { id },
        data: { status: "CLOSED", closedAt: new Date() },
      }),
      prisma.supportTicketEvent.create({
        data: {
          ticketId: id,
          eventType: "CLOSED",
          message: resolution,
          createdBy: userId,
          createdAt: new Date(),
        },
      }),
    ]);
  }

  async addComment(
    ticketId: string,
    comment: string,
    userId: string,
  ): Promise<{ id: string }> {
    const event = await prisma.supportTicketEvent.create({
      data: {
        ticketId,
        eventType: "COMMENT",
        message: comment,
        createdBy: userId,
        createdAt: new Date(),
      },
    });
    return { id: event.id };
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string,
  ): Promise<void> {
    await prisma.$transaction([
      prisma.supportTicket.update({
        where: { id },
        data: {
          status,
          ...(status === "CLOSED" ? { closedAt: new Date() } : {}),
        },
      }),
      prisma.supportTicketEvent.create({
        data: {
          ticketId: id,
          eventType: "STATUS_CHANGED",
          message: `Estado cambiado a ${status}`,
          createdBy: userId,
          createdAt: new Date(),
        },
      }),
    ]);
  }
}
