import { prisma } from "../../../../shared/config/database";
import crypto from "crypto";
import { PushNotificationService } from "../../../../shared/services/push-notification.service";
import { UserStatus } from "@prisma/client";
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
  private toUserStatus(value: string): UserStatus | null {
    const normalized = value.toUpperCase();
    if (normalized === "ACTIVE") return UserStatus.ACTIVE;
    if (normalized === "INACTIVE") return UserStatus.INACTIVE;
    if (normalized === "SUSPENDED") return UserStatus.SUSPENDED;
    if (normalized === "PENDING") return UserStatus.PENDING;
    return null;
  }

  async updateAvailabilityByUserId(
    userId: string,
    isOnline: boolean,
  ): Promise<{ isOnline: boolean; lastSeen: Date }> {
    console.log(userId);
    const courier = await prisma.courier.findFirst({
      where: { userId },
      select: { id: true, availabilityId: true },
    });

    if (!courier) {
      throw new Error("Repartidor no encontrado");
    }

    const now = new Date();

    if (!courier.availabilityId) {
      const availability = await prisma.courierAvailability.create({
        data: {
          isOnline,
          lastSeen: now,
          updatedAt: now,
        },
      });

      await prisma.courier.update({
        where: { id: courier.id },
        data: {
          availabilityId: availability.id,
          updatedAt: now,
        },
      });

      return {
        isOnline: Boolean(availability.isOnline),
        lastSeen: availability.lastSeen ?? now,
      };
    }

    const availability = await prisma.courierAvailability.update({
      where: { id: courier.availabilityId },
      data: {
        isOnline,
        lastSeen: now,
        updatedAt: now,
      },
      select: {
        isOnline: true,
        lastSeen: true,
      },
    });

    return {
      isOnline: Boolean(availability.isOnline),
      lastSeen: availability.lastSeen ?? now,
    };
  }

  async registerRider(data: {
    firstName: string;
    lastName: string;
    documentId: string;
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
          documentNumberEncrypted: Buffer.from(data.documentId, "utf8"),
          documentNumberHash: crypto
            .createHash("sha256")
            .update(data.documentId)
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
          // TODO(workZone): mapear data.workZone a un geofence real cuando se implemente la asignacion de zonas.
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
        data: {
          documentNumberEncrypted: Buffer.from(data.documentId, "utf8"),
          documentNumberHash: crypto
            .createHash("sha256")
            .update(data.documentId)
            .digest("hex"),
          updatedAt: new Date(),
        },
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
    const approved = data.action === "APPROVE";

    const courier = await prisma.$transaction(async (tx) => {
      const c = await tx.courier.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!c) {
        throw new Error("Repartidor no encontrado");
      }

      await tx.courier.update({
        where: { id },
        data: {
          status: approved ? "ACTIVE" : "REJECTED",
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

      if (c.userId) {
        await tx.user.update({
          where: { id: c.userId },
          data: {
            status: approved ? "ACTIVE" : "SUSPENDED",
            updatedAt: new Date(),
          },
        });
      }

      return c;
    });

    if (courier.userId) {
      try {
        await PushNotificationService.sendToUser(
          courier.userId,
          approved ? "🎉 Cuenta aprobada" : "❌ Registro rechazado",
          approved
            ? "Tu cuenta de repartidor ha sido aprobada. ¡Ya puedes conectarte y aceptar servicios!"
            : `Tu registro no fue aprobado. Motivo: ${data.notes || "Documentos no legibles o de vehículo inválidos."}`,
        );
      } catch (err) {
        console.error("❌ Error al enviar notificación en reviewRider:", err);
      }
    }
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

    const userProfile = c.userId
      ? await prisma.userProfile.findUnique({
          where: { userId: c.userId },
          select: { documentNumberEncrypted: true },
        })
      : null;

    const documentNumber = userProfile?.documentNumberEncrypted
      ? Buffer.from(userProfile.documentNumberEncrypted).toString("utf8")
      : null;

    return {
      id: c.id,
      firstName: c.profile?.firstName ?? "",
      lastName: c.profile?.lastName ?? "",
      phone: c.profile?.phone ?? null,
      email: c.profile?.email ?? null,
      photoUrl: c.profile?.photoUrl ?? null,
      status: c.status ?? "UNKNOWN",
      isOnline: c.availability?.isOnline ?? false,
      documentNumber,
      vehicle: c.vehicle
        ? {
            type: c.vehicle.type ?? "",
            brand: c.vehicle.brand ?? "",
            model: c.vehicle.model ?? "",
            plate: c.vehicle.plate ?? "",
            serialNumber: c.vehicle.serialNumber ?? "",
            year: c.vehicle.year ?? null,
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
      select: { profileId: true, userId: true },
    });

    if (!courier) {
      throw new Error("Repartidor no encontrado");
    }

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
      const normalizedStatus = data.status.toUpperCase();
      await prisma.courier.update({
        where: { id },
        data: { status: normalizedStatus, updatedAt: new Date() },
      });

      if (courier.userId) {
        const userStatus = this.toUserStatus(normalizedStatus);
        await prisma.user.update({
          where: { id: courier.userId },
          data: {
            ...(userStatus && { status: userStatus }),
            updatedAt: new Date(),
          },
        });
      }
    }

    if (courier.userId && (data.email || data.firstName || data.lastName)) {
      await prisma.user.update({
        where: { id: courier.userId },
        data: {
          ...(data.email && { email: data.email }),
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          updatedAt: new Date(),
        },
      });
    }
  }

  async deleteRider(id: string): Promise<void> {
    await prisma.courier.update({
      where: { id },
      data: { status: "INACTIVE", updatedAt: new Date() },
    });
  }

  async getRiderDashboardStats(
    id: string,
  ): Promise<{ totalEarnings: number; completedWeekCount: number }> {
    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const completedDeliveries = await prisma.delivery.findMany({
      where: {
        courierId: id,
        status: "DELIVERED",
        completedAt: {
          gte: startOfWeek,
        },
      },
      include: {
        order: {
          select: {
            deliveryFee: true,
          },
        },
      },
    });

    const totalEarnings = completedDeliveries.reduce(
      (sum, d) => sum + Number(d.order?.deliveryFee ?? 0),
      0,
    );

    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      completedWeekCount: completedDeliveries.length,
    };
  }

  async getOrderHistory(
    id: string,
    filters: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      sort?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: any[];
    page: number;
    limit: number;
    total: number;
    totalAmount: number;
  }> {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      courierId: id,
    };

    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.completedAt = {};
      if (filters.dateFrom) {
        where.completedAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.completedAt.lte = new Date(filters.dateTo);
      }
    }

    let orderBy: any = { completedAt: "desc" };
    if (filters.sort === "earnings_desc") {
      orderBy = { order: { deliveryFee: "desc" } };
    } else if (filters.sort === "earnings_asc") {
      orderBy = { order: { deliveryFee: "asc" } };
    } else if (filters.sort === "date_asc") {
      orderBy = { completedAt: "asc" };
    }

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          order: {
            include: {
              restaurant: {
                include: {
                  profile: {
                    select: {
                      name: true,
                    },
                  },
                  location: {
                    include: {
                      addresses: {
                        take: 1,
                      },
                    },
                  },
                },
              },
              notes: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    const mappedOrders = deliveries.map((d) => {
      const logistics = d.order?.notes?.[0]?.note
        ? this.parseLogisticsNote(d.order.notes[0].note)
        : {};
      return {
        id: d.id,
        orderId: d.orderId,
        code:
          d.order?.id?.substring(0, 8).toUpperCase() ||
          d.id.substring(0, 8).toUpperCase(),
        status: d.status || "UNKNOWN",
        restaurantName: d.order?.restaurant?.profile?.name || "Restaurante",
        customerAddress: logistics.customerAddress || "Dirección de entrega",
        amount: Number(d.order?.deliveryFee || 0),
        createdAt: d.completedAt || d.startedAt || new Date(),
      };
    });

    const allDeliveries = await prisma.delivery.findMany({
      where,
      include: {
        order: {
          select: {
            deliveryFee: true,
          },
        },
      },
    });
    const totalAmount = allDeliveries.reduce(
      (sum, d) => sum + Number(d.order?.deliveryFee || 0),
      0,
    );

    return {
      data: mappedOrders,
      page,
      limit,
      total,
      totalAmount,
    };
  }

  async getRiderEarnings(id: string): Promise<{
    today: { amount: number; deliveries: number; hours: number; tips: number; change?: number };
    week: { amount: number; deliveries: number; hours: number; tips: number; change?: number };
    month: { amount: number; deliveries: number; hours: number; tips: number };
    weeklyChart: { day: string; amount: number }[];
    pendingPayments: any[];
    paymentHistory: any[];
  }> {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfPrevWeek = new Date(startOfWeek);
    startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    const [
      todayDeliveries,
      yesterdayDeliveries,
      weekDeliveries,
      prevWeekDeliveries,
      monthDeliveries,
    ] = await Promise.all([
      prisma.delivery.findMany({
        where: {
          courierId: id,
          status: "DELIVERED",
          completedAt: { gte: startOfToday },
        },
        include: { order: { select: { deliveryFee: true } } },
      }),
      prisma.delivery.findMany({
        where: {
          courierId: id,
          status: "DELIVERED",
          completedAt: { gte: startOfYesterday, lt: startOfToday },
        },
        include: { order: { select: { deliveryFee: true } } },
      }),
      prisma.delivery.findMany({
        where: {
          courierId: id,
          status: "DELIVERED",
          completedAt: { gte: startOfWeek },
        },
        include: { order: { select: { deliveryFee: true } } },
      }),
      prisma.delivery.findMany({
        where: {
          courierId: id,
          status: "DELIVERED",
          completedAt: { gte: startOfPrevWeek, lt: startOfWeek },
        },
        include: { order: { select: { deliveryFee: true } } },
      }),
      prisma.delivery.findMany({
        where: {
          courierId: id,
          status: "DELIVERED",
          completedAt: { gte: startOfMonth },
        },
        include: { order: { select: { deliveryFee: true } } },
      }),
    ]);

    const getStats = (deliveries: any[]) => {
      const amount = deliveries.reduce(
        (sum, d) => sum + Number(d.order?.deliveryFee || 0),
        0,
      );
      const minutes = deliveries.reduce((sum, d) => {
        if (d.startedAt && d.completedAt) {
          return (
            sum +
            Math.round(
              (d.completedAt.getTime() - d.startedAt.getTime()) / (1000 * 60),
            )
          );
        }
        return sum + 25;
      }, 0);
      const hours = Math.round((minutes / 60) * 10) / 10;
      const tips = Math.round(amount * 0.1);
      return { amount, deliveries: deliveries.length, hours, tips };
    };

    const todayStats = getStats(todayDeliveries);
    const yesterdayStats = getStats(yesterdayDeliveries);
    const weekStats = getStats(weekDeliveries);
    const prevWeekStats = getStats(prevWeekDeliveries);
    const monthStats = getStats(monthDeliveries);

    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Math.round(((current - previous) / previous) * 100);
    };

    const todayChange = calculateChange(todayStats.amount, yesterdayStats.amount);
    const weekChange = calculateChange(weekStats.amount, prevWeekStats.amount);

    const daysOfWeek = ["L", "M", "M", "J", "V", "S", "D"];
    const weeklyChart = daysOfWeek.map((dayName, index) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + index);
      const startOfDay = new Date(dayDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dayDate);
      endOfDay.setHours(23, 59, 59, 999);

      const dayDeliveries = weekDeliveries.filter((d) => {
        if (!d.completedAt) return false;
        const time = d.completedAt.getTime();
        return time >= startOfDay.getTime() && time <= endOfDay.getTime();
      });

      const amount = dayDeliveries.reduce(
        (sum, d) => sum + Number(d.order?.deliveryFee || 0),
        0,
      );
      return { day: dayName, amount };
    });

    const pendingPayments = [
      {
        id: "pending-1",
        title: "Corte Semana Actual",
        subtitle: "Procesando para Lunes",
        amount: weekStats.amount,
        status: "En revisión",
      },
    ];

    const paymentHistory = [
      {
        id: "payment-1",
        title: "Transferencia Bancaria",
        date: new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        amount: Math.round(weekStats.amount * 0.9 || 350000),
        status: "Pagado",
      },
      {
        id: "payment-2",
        title: "Transferencia Bancaria",
        date: new Date(
          now.getTime() - 14 * 24 * 60 * 60 * 1000,
        ).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        amount: Math.round(weekStats.amount * 0.85 || 320000),
        status: "Pagado",
      },
    ];

    return {
      today: { ...todayStats, change: todayChange },
      week: { ...weekStats, change: weekChange },
      month: monthStats,
      weeklyChart,
      pendingPayments,
      paymentHistory,
    };
  }

  private parseLogisticsNote(note: string | null | undefined): {
    restaurantAddress?: string;
    customerAddress?: string;
    customerNeighborhood?: string;
    destinationLat?: number;
    destinationLon?: number;
    deliveryDistanceKm?: number;
    paymentMethod?: string;
  } {
    if (!note || !note.startsWith("LOGISTICS|")) {
      return {};
    }

    try {
      const raw = note.slice("LOGISTICS|".length);
      const parsed = JSON.parse(raw) as {
        restaurantAddress?: string;
        customerAddress?: string;
        customerNeighborhood?: string;
        destinationLat?: number | null;
        destinationLon?: number | null;
        deliveryDistanceKm?: number | null;
        paymentMethod?: string;
      };

      return {
        restaurantAddress: parsed.restaurantAddress || undefined,
        customerAddress: parsed.customerAddress || undefined,
        customerNeighborhood: parsed.customerNeighborhood || undefined,
        destinationLat:
          typeof parsed.destinationLat === "number"
            ? parsed.destinationLat
            : undefined,
        destinationLon:
          typeof parsed.destinationLon === "number"
            ? parsed.destinationLon
            : undefined,
      };
    } catch {
      return {};
    }
  }
}
