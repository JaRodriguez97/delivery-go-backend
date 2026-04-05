import { prisma } from "../../../../shared/config/database";
import {
  IRestaurantsRepository,
  RestaurantListItem,
  RestaurantDetail,
  RestaurantsKpis,
  RestaurantFilters,
} from "../../domain/repositories/restaurants.repository";
import {
  PaginationParams,
  PaginatedResponse,
  paginatedResponse,
} from "../../../../shared/utils/pagination";

export class PrismaRestaurantsRepository implements IRestaurantsRepository {
  async getKpis(): Promise<RestaurantsKpis> {
    const statuses = await prisma.restaurantStatus.findMany();
    const statusMap = new Map(
      statuses.map((s) => [s.id, s.name?.toUpperCase()]),
    );

    const restaurants = await prisma.restaurant.findMany({
      select: { statusId: true },
    });

    let active = 0,
      inactive = 0,
      pending = 0;
    for (const r of restaurants) {
      const name = statusMap.get(r.statusId ?? "") ?? "";
      if (name === "ACTIVE") active++;
      else if (name === "INACTIVE") inactive++;
      else if (name === "PENDING") pending++;
    }

    return { active, inactive, pending };
  }

  async getRestaurants(
    filters: RestaurantFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<RestaurantListItem>> {
    const where: any = {};

    if (filters.status) {
      where.status = { name: filters.status };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    if (filters.search) {
      where.profile = {
        name: { contains: filters.search, mode: "insensitive" },
      };
    }

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: "desc" },
        include: {
          profile: true,
          owner: true,
          status: true,
          location: { include: { addresses: true } },
        },
      }),
      prisma.restaurant.count({ where }),
    ]);

    const data: RestaurantListItem[] = restaurants.map((r) => ({
      id: r.id,
      name: r.profile?.name ?? "N/A",
      ownerName: r.owner
        ? `${r.owner.firstName ?? ""} ${r.owner.lastName ?? ""}`.trim()
        : "N/A",
      phone: r.profile?.phone ?? r.owner?.phone ?? "",
      address: r.location?.addresses?.[0]?.street ?? "",
      status: r.status?.name ?? "UNKNOWN",
      createdAt: r.createdAt ?? new Date(),
    }));

    return paginatedResponse(data, total, pagination);
  }

  async getRestaurantById(id: string): Promise<RestaurantDetail | null> {
    const r = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        profile: true,
        owner: true,
        status: true,
        schedules: true,
        documents: true,
      },
    });

    if (!r) return null;

    return {
      id: r.id,
      name: r.profile?.name ?? "N/A",
      description: r.profile?.description ?? null,
      phone: r.profile?.phone ?? null,
      email: r.profile?.email ?? null,
      logoUrl: r.profile?.logoUrl ?? null,
      owner: r.owner
        ? {
            id: r.owner.id,
            firstName: r.owner.firstName ?? "",
            lastName: r.owner.lastName ?? "",
            phone: r.owner.phone ?? null,
            email: r.owner.email ?? null,
          }
        : null,
      status: r.status?.name ?? "UNKNOWN",
      schedules: r.schedules.map((s) => ({
        dayOfWeek: s.dayOfWeek ?? 0,
        openTime: s.openTime?.toISOString().substring(11, 16) ?? null,
        closeTime: s.closeTime?.toISOString().substring(11, 16) ?? null,
        isClosed: s.isClosed ?? false,
      })),
      documents: r.documents.map((d) => ({
        id: d.id,
        documentType: d.documentType ?? "",
        documentUrl: d.documentUrl ?? "",
        verified: d.verified ?? false,
      })),
      createdAt: r.createdAt ?? new Date(),
    };
  }

  async createRestaurant(data: {
    name: string;
    description?: string;
    phone?: string;
    email?: string;
    owner: {
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
    };
  }): Promise<{ id: string }> {
    const pendingStatus = await prisma.restaurantStatus.findFirst({
      where: { name: "PENDING" },
    });

    const profile = await prisma.restaurantProfile.create({
      data: {
        name: data.name,
        description: data.description,
        phone: data.phone,
        email: data.email,
        createdAt: new Date(),
      },
    });

    const owner = await prisma.restaurantOwner.create({
      data: {
        firstName: data.owner.firstName,
        lastName: data.owner.lastName,
        phone: data.owner.phone,
        email: data.owner.email,
        createdAt: new Date(),
      },
    });

    const restaurant = await prisma.restaurant.create({
      data: {
        profileId: profile.id,
        ownerId: owner.id,
        statusId: pendingStatus?.id,
        createdAt: new Date(),
      },
    });

    return { id: restaurant.id };
  }

  async updateRestaurant(
    id: string,
    data: {
      name?: string;
      description?: string;
      phone?: string;
      email?: string;
      statusId?: string;
    },
  ): Promise<void> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: { profileId: true },
    });

    if (
      restaurant?.profileId &&
      (data.name || data.description || data.phone || data.email)
    ) {
      await prisma.restaurantProfile.update({
        where: { id: restaurant.profileId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description && { description: data.description }),
          ...(data.phone && { phone: data.phone }),
          ...(data.email && { email: data.email }),
        },
      });
    }

    if (data.statusId) {
      await prisma.restaurant.update({
        where: { id },
        data: { statusId: data.statusId, updatedAt: new Date() },
      });
    }
  }

  async deleteRestaurant(id: string): Promise<void> {
    const inactiveStatus = await prisma.restaurantStatus.findFirst({
      where: { name: "INACTIVE" },
    });

    if (inactiveStatus) {
      await prisma.restaurant.update({
        where: { id },
        data: { statusId: inactiveStatus.id, updatedAt: new Date() },
      });
    }
  }
}
