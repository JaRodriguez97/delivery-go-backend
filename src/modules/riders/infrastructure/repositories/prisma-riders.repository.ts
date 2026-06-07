import { prisma } from "../../../../shared/config/database";
import crypto from "crypto";
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
  async registerRider(data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    passwordHash: string;
    workZone?: string;
    vehicleType: "MOTORCYCLE" | "BICYCLE";
    brand: string;
    model: string;
    plate?: string;
    serialNumber?: string;
    year: number;
    usesBicycle: boolean;
    files: Partial<Record<string, Express.Multer.File>>;
  }): Promise<{ id: string }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error("Ya existe un usuario registrado con ese email");
    }

    return prisma.$transaction(async (tx) => {
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

      const riderRole = await tx.role.findFirst({
        where: { name: "RIDER" },
        select: { id: true },
      });

      if (riderRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: riderRole.id,
            assignedAt: new Date(),
            status: "ACTIVE",
          },
        });
      }

      const courierProfile = await tx.courierProfile.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
          createdAt: new Date(),
        },
      });

      const userProfile = await tx.userProfile.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          documentType: "CC",
          documentNumberEncrypted: Buffer.from("pending", "utf8"),
          documentNumberHash: crypto
            .createHash("sha256")
            .update(`${data.email}-${Date.now()}`)
            .digest("hex"),
          phone: data.phone,
          city: "Cali",
          department: "Valle del Cauca",
          countryCode: "+57",
          createdAt: new Date(),
        },
      });

      const vehicle = await tx.courierVehicle.create({
        data: {
          type: data.vehicleType,
          brand: data.brand,
          model: data.model,
          plate: data.usesBicycle ? null : data.plate,
          serialNumber: data.usesBicycle ? data.serialNumber : null,
          year: data.year,
          color: null,
          createdAt: new Date(),
        },
      });

      const availability = await tx.courierAvailability.create({
        data: { isOnline: false, updatedAt: new Date() },
      });

      const courier = await tx.courier.create({
        data: {
          userId: user.id,
          profileId: courierProfile.id,
          vehicleId: vehicle.id,
          availabilityId: availability.id,
          status: "PENDING",
          createdAt: new Date(),
        },
      });

      const documentEntries: Array<{
        documentType: string;
        documentUrl: string;
      }> = [];
      const toUrl = (file?: Express.Multer.File) =>
        file ? `/uploads/riders/${file.filename}` : undefined;

      const idFileUrl = toUrl(data.files.idFile);
      if (idFileUrl) {
        documentEntries.push({
          documentType: "DNI_FRONT",
          documentUrl: idFileUrl,
        });
      }

      const selfieFileUrl = toUrl(data.files.selfieFile);
      if (selfieFileUrl) {
        documentEntries.push({
          documentType: "SELFIE",
          documentUrl: selfieFileUrl,
        });
      }

      const licenseFileUrl = toUrl(data.files.licenseFile);
      if (licenseFileUrl) {
        documentEntries.push({
          documentType: "DRIVER_LICENSE",
          documentUrl: licenseFileUrl,
        });
      }

      const ownershipCardUrl = toUrl(data.files.ownershipCardFile);
      if (ownershipCardUrl) {
        documentEntries.push({
          documentType: "OWNERSHIP_CARD",
          documentUrl: ownershipCardUrl,
        });
      }

      const soatUrl = toUrl(data.files.soatFile);
      if (soatUrl) {
        documentEntries.push({ documentType: "SOAT", documentUrl: soatUrl });
      }

      const technicalReviewUrl = toUrl(data.files.technicalReviewFile);
      if (technicalReviewUrl) {
        documentEntries.push({
          documentType: "TECHNICAL_REVIEW",
          documentUrl: technicalReviewUrl,
        });
      }

      const selfieWithVehicleUrl = toUrl(data.files.selfieWithVehicleFile);
      if (selfieWithVehicleUrl) {
        documentEntries.push({
          documentType: "SELFIE_WITH_VEHICLE",
          documentUrl: selfieWithVehicleUrl,
        });
      }

      const fullVehiclePhotoUrl = toUrl(data.files.fullVehiclePhotoFile);
      if (fullVehiclePhotoUrl) {
        documentEntries.push({
          documentType: "FULL_VEHICLE_PHOTO",
          documentUrl: fullVehiclePhotoUrl,
        });
      }

      const plateOrSerialPhotoUrl = toUrl(data.files.plateOrSerialPhotoFile);
      if (plateOrSerialPhotoUrl) {
        documentEntries.push({
          documentType: data.usesBicycle
            ? "BICYCLE_SERIAL_PHOTO"
            : "LICENSE_PLATE_PHOTO",
          documentUrl: plateOrSerialPhotoUrl,
        });
      }

      if (documentEntries.length) {
        await tx.courierDocument.createMany({
          data: documentEntries.map((entry) => ({
            courierId: courier.id,
            documentType: entry.documentType,
            documentUrl: entry.documentUrl,
            verified: false,
            reviewStatus: "PENDING",
            uploadedAt: new Date(),
          })),
        });
      }

      await tx.courierZoneAssignment.create({
        data: {
          courierId: courier.id,
          geofenceId: null,
          assignedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          status: "PENDING",
          updatedAt: new Date(),
        },
      });

      await tx.userProfile.update({
        where: { id: userProfile.id },
        data: { updatedAt: new Date() },
      });

      return { id: courier.id };
    });
  }

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

  async reviewRider(
    id: string,
    data: { action: "APPROVE" | "REJECT"; notes?: string },
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const courier = await tx.courier.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!courier) {
        throw new Error("Repartidor no encontrado");
      }

      const approved = data.action === "APPROVE";

      await tx.courier.update({
        where: { id },
        data: {
          status: approved ? "ACTIVE" : "INACTIVE",
          reviewNotes: data.notes,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.courierDocument.updateMany({
        where: { courierId: id },
        data: {
          reviewStatus: approved ? "APPROVED" : "REJECTED",
          verified: approved,
          rejectionReason: approved ? null : data.notes,
          reviewedAt: new Date(),
        },
      });

      if (courier.userId) {
        await tx.user.update({
          where: { id: courier.userId },
          data: {
            status: approved ? "ACTIVE" : "INACTIVE",
            updatedAt: new Date(),
          },
        });
      }
    });
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
