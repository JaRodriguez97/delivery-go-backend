import { prisma } from "../../../../shared/config/database";
import {
  ISupportRepository,
  TicketListItem,
  TicketDetail,
  SupportKpis,
  TicketFilters,
} from "../../domain/repositories/support.repository";

export class PrismaSupportRepository implements ISupportRepository {
  async getKpis(): Promise<SupportKpis> {
    const groups = await prisma.supportTicket.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    let open = 0;
    let inProgress = 0;
    let closed = 0;
    for (const g of groups) {
      const s = g.status?.toUpperCase();
      if (s === "OPEN") open = g._count.id;
      else if (s === "IN_PROGRESS") inProgress = g._count.id;
      else if (s === "CLOSED" || s === "RESOLVED") closed += g._count.id;
    }

    // Average resolution time
    const closedTickets = await prisma.supportTicket.findMany({
      where: { closedAt: { not: null } },
      select: { createdAt: true, closedAt: true },
    });

    let totalHours = 0;
    let countClosed = 0;
    for (const t of closedTickets) {
      if (t.createdAt && t.closedAt) {
        totalHours += (t.closedAt.getTime() - t.createdAt.getTime()) / 3600000;
        countClosed++;
      }
    }

    return {
      open,
      inProgress,
      closed,
      avgResolutionHours:
        countClosed > 0
          ? Math.round((totalHours / countClosed) * 100) / 100
          : 0,
    };
  }

  async getTickets(
    filters: TicketFilters,
    pagination: { skip: number; limit: number },
  ): Promise<{ data: TicketListItem[]; total: number }> {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: { include: { profile: true } },
          _count: { select: { events: true } },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      data: data.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        userName: t.user?.profile
          ? `${t.user.profile.firstName ?? ""} ${t.user.profile.lastName ?? ""}`.trim()
          : null,
        orderId: t.orderId,
        createdAt: t.createdAt,
        closedAt: t.closedAt,
        eventsCount: t._count.events,
      })),
      total,
    };
  }

  async getTicketById(id: string): Promise<TicketDetail | null> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { include: { profile: true } },
        events: { orderBy: { createdAt: "asc" } },
        _count: { select: { events: true } },
      },
    });

    if (!ticket) return null;

    return {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      userName: ticket.user?.profile
        ? `${ticket.user.profile.firstName ?? ""} ${ticket.user.profile.lastName ?? ""}`.trim()
        : null,
      orderId: ticket.orderId,
      createdAt: ticket.createdAt,
      closedAt: ticket.closedAt,
      eventsCount: ticket._count.events,
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
}
