import { prisma } from "../../../../shared/config/database";
import {
  IRidersRepository,
  RiderListItem,
  RiderDetail,
  RidersKpis,
  RiderFilters,
} from "../../domain/repositories/riders.repository";
import {
  PaginationParams,
  PaginatedResponse,
  paginatedResponse,
} from "../../../../shared/utils/pagination";

export class PrismaRidersRepository implements IRidersRepository {
  async getKpis(): Promise<RidersKpis> {
    const couriers = await prisma.courier.findMany({
      include: { availability: true },
    });

    let active = 0,
      inactive = 0,
      online = 0,
      pendingRegistration = 0;
    for (const c of couriers) {
      const s = c.status?.toUpperCase() ?? "";
      if (s === "ACTIVE") active++;
      else if (s === "INACTIVE") inactive++;
      else if (s === "PENDING") pendingRegistration++;
      if (c.availability?.isOnline) online++;
    }

    const inOrder = await prisma.delivery.count({
      where: {
        status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] },
        courierId: { not: null },
      },
    });

    return { active, inactive, online, inOrder, pendingRegistration };
  }

  async getRiders(
    filters: RiderFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<RiderListItem>> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }
    if (filters.search) {
      where.profile = {
        OR: [
          { firstName: { contains: filters.search, mode: "insensitive" } },
          { lastName: { contains: filters.search, mode: "insensitive" } },
        ],
      };
    }
    if (filters.phone) {
      where.profile = {
        ...where.profile,
        phone: { contains: filters.phone },
      };
    }
    if (filters.isOnline !== undefined) {
      where.availability = { isOnline: filters.isOnline };
    }

    const [couriers, total] = await Promise.all([
      prisma.courier.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: "desc" },
        include: {
          profile: true,
          vehicle: true,
          availability: true,
          zoneAssignments: { include: { geofence: true } },
          deliveries: {
            where: { status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } },
          },
        },
      }),
      prisma.courier.count({ where }),
    ]);

    const totalDeliveryCounts = await prisma.delivery.groupBy({
      by: ["courierId"],
      _count: { id: true },
      where: { courierId: { in: couriers.map((c) => c.id) } },
    });
    const totalMap = new Map(
      totalDeliveryCounts.map((d) => [d.courierId, d._count.id]),
    );

    const data: RiderListItem[] = couriers.map((c) => ({
      id: c.id,
      name: c.profile
        ? `${c.profile.firstName ?? ""} ${c.profile.lastName ?? ""}`.trim()
        : "N/A",
      phone: c.profile?.phone ?? "",
      vehicleType: c.vehicle?.type ?? null,
      vehicleDescription: c.vehicle
        ? `${c.vehicle.brand ?? ""} ${c.vehicle.model ?? ""}`.trim() || null
        : null,
      zone: c.zoneAssignments?.[0]?.geofence?.name ?? null,
      status: c.status ?? "UNKNOWN",
      isOnline: c.availability?.isOnline ?? false,
      currentOrders: c.deliveries.length,
      totalOrders: totalMap.get(c.id) ?? 0,
    }));

    return paginatedResponse(data, total, pagination);
  }

  async getRiderById(id: string): Promise<RiderDetail | null> {
    const c = await prisma.courier.findUnique({
      where: { id },
      include: {
        profile: true,
        vehicle: true,
        availability: true,
        documents: true,
        zoneAssignments: { include: { geofence: true } },
      },
    });

    if (!c) return null;

    return {
      id: c.id,
      firstName: c.profile?.firstName ?? "",
      lastName: c.profile?.lastName ?? "",
      phone: c.profile?.phone ?? null,
      email: c.profile?.email ?? null,
      photoUrl: c.profile?.photoUrl ?? null,
      status: c.status ?? "UNKNOWN",
      isOnline: c.availability?.isOnline ?? false,
      vehicle: c.vehicle
        ? {
            type: c.vehicle.type ?? "",
            brand: c.vehicle.brand ?? "",
            model: c.vehicle.model ?? "",
            plate: c.vehicle.plate ?? "",
            color: c.vehicle.color ?? "",
          }
        : null,
      documents: c.documents.map((d) => ({
        id: d.id,
        documentType: d.documentType ?? "",
        documentUrl: d.documentUrl ?? "",
        verified: d.verified ?? false,
      })),
      zones: c.zoneAssignments
        .filter((z) => z.geofence)
        .map((z) => ({ id: z.id, geofenceName: z.geofence!.name ?? "" })),
      createdAt: c.createdAt ?? new Date(),
    };
  }

  async createRider(data: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    vehicle?: {
      type: string;
      brand?: string;
      model?: string;
      plate?: string;
      color?: string;
    };
  }): Promise<{ id: string }> {
    const profile = await prisma.courierProfile.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        createdAt: new Date(),
      },
    });

    let vehicleId: string | undefined;
    if (data.vehicle) {
      const vehicle = await prisma.courierVehicle.create({
        data: {
          type: data.vehicle.type,
          brand: data.vehicle.brand,
          model: data.vehicle.model,
          plate: data.vehicle.plate,
          color: data.vehicle.color,
          createdAt: new Date(),
        },
      });
      vehicleId = vehicle.id;
    }

    const availability = await prisma.courierAvailability.create({
      data: { isOnline: false, updatedAt: new Date() },
    });

    const courier = await prisma.courier.create({
      data: {
        profileId: profile.id,
        vehicleId,
        availabilityId: availability.id,
        status: "PENDING",
        createdAt: new Date(),
      },
    });

    return { id: courier.id };
  }

  async updateRider(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      status?: string;
    },
  ): Promise<void> {
    const courier = await prisma.courier.findUnique({
      where: { id },
      select: { profileId: true },
    });

    if (
      courier?.profileId &&
      (data.firstName || data.lastName || data.phone || data.email)
    ) {
      await prisma.courierProfile.update({
        where: { id: courier.profileId },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.phone && { phone: data.phone }),
          ...(data.email && { email: data.email }),
        },
      });
    }

    if (data.status) {
      await prisma.courier.update({
        where: { id },
        data: { status: data.status.toUpperCase(), updatedAt: new Date() },
      });
    }
  }

  async deleteRider(id: string): Promise<void> {
    await prisma.courier.update({
      where: { id },
      data: { status: "INACTIVE", updatedAt: new Date() },
    });
  }
}
