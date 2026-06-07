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

const RESTAURANT_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

const RESTAURANT_STATUS_DESCRIPTION: Record<string, string> = {
  PENDING: "Pendiente de revisión",
  ACTIVE: "Restaurante activo y operando",
  INACTIVE: "Restaurante temporalmente inactivo",
};

export class PrismaRestaurantsRepository implements IRestaurantsRepository {
  private normalizeBoolean(value?: boolean | string): boolean | undefined {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (["true", "1", "si", "sí", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }

    return undefined;
  }

  private normalizeNumber(value?: number | string): number | undefined {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private normalizeCuisines(value?: string[] | string): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => item.trim()).filter(Boolean);
    }

    if (typeof value !== "string") {
      return [];
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // Si no es JSON valido, cae al split por comas.
      }
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private composeRestaurantDescription(data: {
    description?: string;
    deliveryEnabled?: boolean | string;
    prepTimeMinutes?: number | string;
    cuisineTypes?: string[] | string;
  }): string | undefined {
    const parts: string[] = [];
    const baseDescription = data.description?.trim();
    const deliveryEnabled = this.normalizeBoolean(data.deliveryEnabled);
    const prepTimeMinutes = this.normalizeNumber(data.prepTimeMinutes);
    const cuisineTypes = this.normalizeCuisines(data.cuisineTypes);

    if (baseDescription) {
      parts.push(baseDescription);
    }
    if (cuisineTypes.length > 0) {
      parts.push(`Cocina: ${cuisineTypes.join(", ")}`);
    }
    if (typeof prepTimeMinutes === "number") {
      parts.push(`Tiempo de preparación: ${prepTimeMinutes} min`);
    }
    if (typeof deliveryEnabled === "boolean") {
      parts.push(`Domicilio: ${deliveryEnabled ? "Sí" : "No"}`);
    }

    return parts.length > 0 ? parts.join(" | ") : undefined;
  }

  private async ensureRestaurantStatusId(
    tx: Omit<
      typeof prisma,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >,
    name: string,
  ): Promise<string> {
    const normalizedName = name.toUpperCase();
    const aliases: Record<string, string[]> = {
      PENDING: ["PENDING"],
      ACTIVE: ["ACTIVE"],
      INACTIVE: ["INACTIVE"],
    };

    const candidateNames = aliases[normalizedName] ?? [normalizedName];
    const existing = await tx.restaurantStatus.findFirst({
      where: { name: { in: candidateNames } },
      orderBy: { name: "asc" },
      select: { id: true },
    });

    if (existing?.id) {
      return existing.id;
    }

    const created = await tx.restaurantStatus.create({
      data: {
        name: normalizedName,
        description:
          RESTAURANT_STATUS_DESCRIPTION[normalizedName] ??
          `Estado ${normalizedName} autogenerado`,
      },
      select: { id: true },
    });

    return created.id;
  }

  async registerRestaurant(data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    passwordHash: string;
    restaurantName: string;
    address: string;
    neighborhood?: string;
    licenseNumber?: string;
    deliveryEnabled?: boolean | string;
    prepTimeMinutes?: number | string;
    cuisineTypes?: string[] | string;
    description?: string;
    businessLicenseUrl?: string;
  }): Promise<{ id: string }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error("Ya existe un usuario registrado con ese email");
    }

    return prisma.$transaction(async (tx) => {
      const pendingStatusId = await this.ensureRestaurantStatusId(
        tx,
        RESTAURANT_STATUS.PENDING,
      );

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          status: "PENDING",
          emailVerified: false,
          accountLocked: false,
          createdAt: new Date(),
        },
      });

      const restaurantRole = await tx.role.findFirst({
        where: { name: { in: ["RESTAURANT", "RESTAURANT_OWNER"] } },
        select: { id: true },
      });

      if (restaurantRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: restaurantRole.id,
            assignedAt: new Date(),
            status: "ACTIVE",
          },
        });
      }

      const owner = await tx.restaurantOwner.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
          createdAt: new Date(),
        },
      });

      const profile = await tx.restaurantProfile.create({
        data: {
          name: data.restaurantName,
          description: this.composeRestaurantDescription(data),
          licenseNumber: data.licenseNumber,
          phone: data.phone,
          email: data.email,
          createdAt: new Date(),
        },
      });

      const location = await tx.location.create({
        data: {
          name: `Locacion ${data.restaurantName}`,
          createdAt: new Date(),
          addresses: {
            create: {
              street: data.address,
              neighborhood: data.neighborhood,
              city: "Cali",
              state: "Valle del Cauca",
              country: "CO",
              createdAt: new Date(),
            },
          },
        },
      });

      const restaurant = await tx.restaurant.create({
        data: {
          ownerId: owner.id,
          profileId: profile.id,
          locationId: location.id,
          statusId: pendingStatusId,
          createdAt: new Date(),
        },
      });

      if (data.businessLicenseUrl) {
        await tx.restaurantDocument.create({
          data: {
            restaurantId: restaurant.id,
            documentType: "BUSINESS_LICENSE",
            documentUrl: data.businessLicenseUrl,
            verified: false,
            uploadedAt: new Date(),
          },
        });
      }

      return { id: restaurant.id };
    });
  }

  async reviewRestaurant(
    id: string,
    data: { action: "APPROVE" | "REJECT"; notes?: string },
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.findUnique({
        where: { id },
        include: { owner: true },
      });

      if (!restaurant) {
        throw new Error("Restaurante no encontrado");
      }

      const statusName =
        data.action === "APPROVE"
          ? RESTAURANT_STATUS.ACTIVE
          : RESTAURANT_STATUS.INACTIVE;
      const statusId = await this.ensureRestaurantStatusId(tx, statusName);

      await tx.restaurant.update({
        where: { id },
        data: {
          statusId,
          updatedAt: new Date(),
        },
      });

      if (restaurant.owner?.userId) {
        await tx.user.update({
          where: { id: restaurant.owner.userId },
          data: {
            status: data.action === "APPROVE" ? "ACTIVE" : "INACTIVE",
            updatedAt: new Date(),
          },
        });
      }
    });
  }

  async toggleRestaurantStatus(id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.findUnique({
        where: { id },
        include: { status: true, owner: true },
      });

      if (!restaurant) {
        throw new Error("Restaurante no encontrado");
      }

      const currentStatus = restaurant.status?.name?.toUpperCase();
      const nextStatusName =
        currentStatus === RESTAURANT_STATUS.ACTIVE
          ? RESTAURANT_STATUS.INACTIVE
          : RESTAURANT_STATUS.ACTIVE;
      const nextStatusId = await this.ensureRestaurantStatusId(
        tx,
        nextStatusName,
      );

      await tx.restaurant.update({
        where: { id },
        data: {
          statusId: nextStatusId,
          updatedAt: new Date(),
        },
      });

      if (restaurant.owner?.userId) {
        await tx.user.update({
          where: { id: restaurant.owner.userId },
          data: {
            status: nextStatusName,
            updatedAt: new Date(),
          },
        });
      }
    });
  }

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
      if (name === RESTAURANT_STATUS.ACTIVE) active++;
      else if (name === RESTAURANT_STATUS.INACTIVE) inactive++;
      else if (name === RESTAURANT_STATUS.PENDING) pending++;
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
        location: { include: { addresses: true } },
        schedules: true,
        documents: true,
      },
    });
    console.log("🚀 ~ PrismaRestaurantsRepository ~ getRestaurantById ~ r:", r);

    if (!r) return null;

    return {
      id: r.id,
      name: r.profile?.name ?? "N/A",
      description: r.profile?.description ?? null,
      licenseNumber: r.profile?.licenseNumber ?? null,
      phone: r.profile?.phone ?? null,
      email: r.profile?.email ?? null,
      logoUrl: r.profile?.logoUrl ?? null,
      address: r.location?.addresses?.[0]?.street ?? null,
      neighborhood: r.location?.addresses?.[0]?.neighborhood ?? null,
      city: r.location?.addresses?.[0]?.city ?? null,
      state: r.location?.addresses?.[0]?.state ?? null,
      country: r.location?.addresses?.[0]?.country ?? null,
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
    address?: string;
    neighborhood?: string;
    licenseNumber?: string;
    deliveryEnabled?: boolean | string;
    prepTimeMinutes?: number | string;
    cuisineTypes?: string[] | string;
    owner: {
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
    };
  }): Promise<{ id: string }> {
    return prisma.$transaction(async (tx) => {
      const pendingStatusId = await this.ensureRestaurantStatusId(
        tx,
        RESTAURANT_STATUS.PENDING,
      );

      const profile = await tx.restaurantProfile.create({
        data: {
          name: data.name,
          description: this.composeRestaurantDescription(data),
          licenseNumber: data.licenseNumber,
          phone: data.phone,
          email: data.email,
          createdAt: new Date(),
        },
      });

      const owner = await tx.restaurantOwner.create({
        data: {
          firstName: data.owner.firstName,
          lastName: data.owner.lastName,
          phone: data.owner.phone,
          email: data.owner.email,
          createdAt: new Date(),
        },
      });

      const location = data.address
        ? await tx.location.create({
            data: {
              name: `Locacion ${data.name}`,
              createdAt: new Date(),
              addresses: {
                create: {
                  street: data.address,
                  neighborhood: data.neighborhood,
                  city: "Cali",
                  state: "Valle del Cauca",
                  country: "CO",
                  createdAt: new Date(),
                },
              },
            },
          })
        : null;

      const restaurant = await tx.restaurant.create({
        data: {
          profileId: profile.id,
          ownerId: owner.id,
          statusId: pendingStatusId,
          locationId: location?.id,
          createdAt: new Date(),
        },
      });

      return { id: restaurant.id };
    });
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
    const inactiveStatusId = await this.ensureRestaurantStatusId(
      prisma,
      RESTAURANT_STATUS.INACTIVE,
    );

    await prisma.restaurant.update({
      where: { id },
      data: { statusId: inactiveStatusId, updatedAt: new Date() },
    });
  }
}
