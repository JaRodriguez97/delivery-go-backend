import { prisma } from "../../../../shared/config/database";
import {
  ITrackingRepository,
  ActiveDeliveryResult,
  ActiveDeliveryFilter,
  ActiveRiderResult,
  OrderTrackingResult,
  RiderTrackingResult,
  RoutePointResult,
} from "../../domain/repositories/tracking.repository";

export class PrismaTrackingRepository implements ITrackingRepository {
  async getActiveDeliveries(params?: {
    search?: string;
    filter?: ActiveDeliveryFilter;
    limit?: number;
  }): Promise<ActiveDeliveryResult[]> {
    const limit = Math.min(100, Math.max(1, params?.limit ?? 30));
    const filter = params?.filter ?? "ALL";
    const normalizedSearch = params?.search?.trim().toLowerCase() ?? "";

    const activeStatuses = new Set([
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "ASSIGNED",
      "PICKED_UP",
      "IN_TRANSIT",
      "HEADING_TO_RESTAURANT",
      "AT_RESTAURANT",
    ]);
    const inDeliveryStatuses = new Set(["PICKED_UP", "IN_TRANSIT"]);

    const orders = await prisma.order.findMany({
      where: {
        delivery: {
          isNot: null,
        },
      },
      select: {
        id: true,
        createdAt: true,
        status: {
          select: {
            name: true,
          },
        },
        restaurant: {
          select: {
            profile: {
              select: {
                name: true,
              },
            },
          },
        },
        delivery: {
          select: {
            id: true,
            status: true,
            courierId: true,
            trackingLatest: {
              select: {
                latitude: true,
                longitude: true,
                recordedAt: true,
              },
            },
            courier: {
              select: {
                status: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    photoUrl: true,
                  },
                },
                availability: {
                  select: {
                    isOnline: true,
                  },
                },
              },
            },
            routes: {
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
              select: {
                origin: {
                  select: {
                    addresses: {
                      take: 1,
                      select: {
                        street: true,
                      },
                    },
                  },
                },
                destination: {
                  select: {
                    addresses: {
                      take: 1,
                      select: {
                        street: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit * 3,
    });

    const mapped = orders
      .map((order): ActiveDeliveryResult | null => {
        const delivery = order.delivery;
        if (!delivery?.id) {
          return null;
        }

        const route = delivery.routes[0];
        const status = (
          order.status?.name ??
          delivery.status ??
          "UNKNOWN"
        ).toUpperCase();

        if (!activeStatuses.has(status)) {
          return null;
        }

        const riderName =
          `${delivery.courier?.profile?.firstName ?? ""} ${delivery.courier?.profile?.lastName ?? ""}`.trim();
        const courierStatus = (delivery.courier?.status ?? "").toUpperCase();

        if (courierStatus !== "ACTIVE") {
          return null;
        }

        const pickupAddress =
          route?.origin?.addresses?.[0]?.street ??
          order.restaurant?.profile?.name ??
          null;
        const destinationAddress =
          route?.destination?.addresses?.[0]?.street ?? null;
        const isRiderOnline = Boolean(delivery.courier?.availability?.isOnline);

        const searchableText = [
          order.id,
          riderName,
          pickupAddress,
          destinationAddress,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (normalizedSearch && !searchableText.includes(normalizedSearch)) {
          return null;
        }

        if (filter === "ONLINE" && !isRiderOnline) {
          return null;
        }

        if (filter === "OFFLINE" && isRiderOnline) {
          return null;
        }

        if (filter === "IN_DELIVERY" && !inDeliveryStatuses.has(status)) {
          return null;
        }

        const tracking = delivery.trackingLatest;
        const riderLocation =
          tracking?.latitude && tracking?.longitude
            ? {
                latitude: Number(tracking.latitude),
                longitude: Number(tracking.longitude),
                timestamp: tracking.recordedAt ?? new Date(),
              }
            : null;

        const elapsedMinutes = order.createdAt
          ? Math.max(
              0,
              Math.floor((Date.now() - order.createdAt.getTime()) / 60000),
            )
          : null;

        return {
          deliveryId: delivery.id,
          orderId: order.id,
          status,
          elapsedMinutes,
          riderId: delivery.courierId ?? null,
          riderName: riderName || null,
          riderAvatarUrl: delivery.courier?.profile?.photoUrl ?? null,
          isRiderOnline,
          pickupAddress,
          destinationAddress,
          riderLocation,
        };
      })
      .filter((item): item is ActiveDeliveryResult => item !== null);

    return mapped.slice(0, limit);
  }

  async getOrderTracking(orderId: string): Promise<OrderTrackingResult | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: {
          select: {
            name: true,
          },
        },
        delivery: {
          select: {
            courierId: true,
            trackingLatest: {
              select: {
                latitude: true,
                longitude: true,
                recordedAt: true,
              },
            },
            courier: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            routes: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: {
                estimatedDurationMinutes: true,
                distanceKm: true,
              },
            },
          },
        },
      },
    });

    if (!order) return null;

    const delivery = order.delivery;
    const tracking = delivery?.trackingLatest;
    const route = delivery?.routes?.[0];

    return {
      orderId: order.id,
      status: order.status?.name ?? "UNKNOWN",
      currentLocation:
        tracking?.latitude && tracking?.longitude
          ? {
              latitude: Number(tracking.latitude),
              longitude: Number(tracking.longitude),
              timestamp: tracking.recordedAt ?? new Date(),
            }
          : null,
      estimatedDeliveryTime: route?.estimatedDurationMinutes
        ? new Date(Date.now() + route.estimatedDurationMinutes * 60000)
        : null,
      deliveryDistance: route?.distanceKm ? Number(route.distanceKm) : null,
      riderId: delivery?.courierId ?? null,
      riderLocation:
        tracking?.latitude && tracking?.longitude
          ? {
              latitude: Number(tracking.latitude),
              longitude: Number(tracking.longitude),
              timestamp: tracking.recordedAt ?? new Date(),
            }
          : null,
    };
  }

  async getActiveRiders(params?: {
    search?: string;
    filter?: ActiveDeliveryFilter;
    limit?: number;
  }): Promise<ActiveRiderResult[]> {
    const limit = Math.min(300, Math.max(1, params?.limit ?? 100));
    const filter = params?.filter ?? "ALL";
    const normalizedSearch = params?.search?.trim().toLowerCase() ?? "";

    const couriers = await prisma.courier.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            photoUrl: true,
          },
        },
        availability: {
          select: {
            isOnline: true,
            lastSeen: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const riderIds = couriers.map((c) => c.id);

    const latestHistory = riderIds.length
      ? await prisma.trackingHistory.findMany({
          where: { courierId: { in: riderIds } },
          orderBy: { recordedAt: "desc" },
          select: {
            courierId: true,
            latitude: true,
            longitude: true,
            recordedAt: true,
          },
        })
      : [];

    const latestByRider = new Map<
      string,
      {
        latitude: number;
        longitude: number;
        timestamp: Date;
      }
    >();

    for (const row of latestHistory) {
      if (!row.courierId || latestByRider.has(row.courierId)) {
        continue;
      }

      if (row.latitude && row.longitude) {
        latestByRider.set(row.courierId, {
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          timestamp: row.recordedAt ?? new Date(),
        });
      }
    }

    const inDeliveryCourierIds = new Set(
      (
        await prisma.delivery.findMany({
          where: {
            courierId: { in: riderIds },
            status: {
              in: [
                "ASSIGNED",
                "HEADING_TO_RESTAURANT",
                "AT_RESTAURANT",
                "PICKED_UP",
                "IN_TRANSIT",
              ],
            },
          },
          select: { courierId: true },
        })
      )
        .map((d) => d.courierId)
        .filter((id): id is string => Boolean(id)),
    );

    return couriers
      .map((courier) => {
        const riderName =
          `${courier.profile?.firstName ?? ""} ${courier.profile?.lastName ?? ""}`.trim();
        const isOnline = Boolean(courier.availability?.isOnline);

        if (filter === "ONLINE" && !isOnline) {
          return null;
        }

        if (filter === "OFFLINE" && isOnline) {
          return null;
        }

        if (filter === "IN_DELIVERY" && !inDeliveryCourierIds.has(courier.id)) {
          return null;
        }

        const searchable = [courier.id, riderName].join(" ").toLowerCase();
        if (normalizedSearch && !searchable.includes(normalizedSearch)) {
          return null;
        }

        return {
          riderId: courier.id,
          riderName: riderName || null,
          riderAvatarUrl: courier.profile?.photoUrl ?? null,
          isOnline,
          lastSeen: courier.availability?.lastSeen ?? null,
          riderLocation: latestByRider.get(courier.id) ?? null,
        };
      })
      .filter((item): item is ActiveRiderResult => item !== null);
  }

  async getRiderTracking(riderId: string): Promise<RiderTrackingResult | null> {
    const courier = await prisma.courier.findUnique({
      where: { id: riderId },
      include: {
        profile: true,
        availability: true,
        deliveries: {
          where: { status: { in: ["IN_TRANSIT", "PICKED_UP", "ASSIGNED"] } },
          include: {
            trackingLatest: true,
          },
        },
      },
    });

    if (!courier) return null;

    const latestTracking = courier.deliveries
      .map((d) => d.trackingLatest)
      .filter(Boolean)
      .sort((a, b) => {
        const ta = a?.recordedAt?.getTime() ?? 0;
        const tb = b?.recordedAt?.getTime() ?? 0;
        return tb - ta;
      })[0];

    return {
      riderId: courier.id,
      name: `${courier.profile?.firstName ?? ""} ${courier.profile?.lastName ?? ""}`.trim(),
      isOnline: courier.availability?.isOnline ?? false,
      currentLocation:
        latestTracking?.latitude && latestTracking?.longitude
          ? {
              latitude: Number(latestTracking.latitude),
              longitude: Number(latestTracking.longitude),
              timestamp: latestTracking.recordedAt ?? new Date(),
            }
          : null,
      activeDeliveries: courier.deliveries.map((d) => ({
        deliveryId: d.id,
        orderId: d.orderId,
        status: d.status,
      })),
    };
  }

  async getDeliveryRoute(orderId: string): Promise<RoutePointResult[]> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        delivery: {
          select: {
            routes: {
              select: {
                origin: {
                  select: {
                    addresses: {
                      select: {
                        latitude: true,
                        longitude: true,
                        street: true,
                      },
                    },
                  },
                },
                destination: {
                  select: {
                    addresses: {
                      select: {
                        latitude: true,
                        longitude: true,
                        street: true,
                      },
                    },
                  },
                },
              },
            },
            trackingHistory: {
              orderBy: { recordedAt: "asc" },
              select: {
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });

    if (!order?.delivery) return [];

    const delivery = order.delivery;
    const points: RoutePointResult[] = [];

    const route = delivery.routes?.[0];
    if (route?.origin?.addresses?.[0]) {
      const addr = route.origin.addresses[0];
      if (addr.latitude && addr.longitude) {
        points.push({
          latitude: Number(addr.latitude),
          longitude: Number(addr.longitude),
          type: "start",
          address: addr.street ?? undefined,
        });
      }
    }

    for (const th of delivery.trackingHistory) {
      if (th.latitude && th.longitude) {
        points.push({
          latitude: Number(th.latitude),
          longitude: Number(th.longitude),
          type: "waypoint",
        });
      }
    }

    if (route?.destination?.addresses?.[0]) {
      const addr = route.destination.addresses[0];
      if (addr.latitude && addr.longitude) {
        points.push({
          latitude: Number(addr.latitude),
          longitude: Number(addr.longitude),
          type: "destination",
          address: addr.street ?? undefined,
        });
      }
    }

    return points;
  }

  async updateCourierLocationByUserId(params: {
    userId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    recordedAt?: Date;
  }): Promise<{ deliveryId: string }> {
    const courier = await prisma.courier.findFirst({
      where: { userId: params.userId },
      select: { id: true, availabilityId: true },
    });

    if (!courier?.id) {
      throw new Error("Repartidor no encontrado");
    }

    const activeDelivery = await prisma.delivery.findFirst({
      where: {
        courierId: courier.id,
        status: {
          in: [
            "ASSIGNED",
            "HEADING_TO_RESTAURANT",
            "AT_RESTAURANT",
            "PICKED_UP",
            "IN_TRANSIT",
          ],
        },
      },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    });

    const recordedAt = params.recordedAt ?? new Date();

    await prisma.$transaction(async (tx) => {
      if (activeDelivery?.id) {
        await tx.trackingLatest.upsert({
          where: { deliveryId: activeDelivery.id },
          create: {
            deliveryId: activeDelivery.id,
            courierId: courier.id,
            latitude: params.latitude,
            longitude: params.longitude,
            speed: params.speed,
            heading: params.heading,
            recordedAt,
          },
          update: {
            courierId: courier.id,
            latitude: params.latitude,
            longitude: params.longitude,
            speed: params.speed,
            heading: params.heading,
            recordedAt,
          },
        });
      }

      await tx.trackingHistory.create({
        data: {
          deliveryId: activeDelivery?.id,
          courierId: courier.id,
          latitude: params.latitude,
          longitude: params.longitude,
          speed: params.speed,
          heading: params.heading,
          recordedAt,
        },
      });

      if (courier.availabilityId) {
        await tx.courierAvailability.update({
          where: { id: courier.availabilityId },
          data: {
            isOnline: true,
            lastSeen: recordedAt,
            updatedAt: new Date(),
          },
        });
      }
    });

    return { deliveryId: activeDelivery?.id ?? "NO_ACTIVE_DELIVERY" };
  }
}
