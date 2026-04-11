import { prisma } from "../../../../shared/config/database";
import {
  ITrackingRepository,
  ActiveDeliveryResult,
  ActiveDeliveryFilter,
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
      include: {
        status: true,
        restaurant: {
          include: {
            profile: true,
          },
        },
        delivery: {
          include: {
            trackingLatest: true,
            courier: {
              include: {
                profile: true,
                availability: true,
              },
            },
            routes: {
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
              include: {
                origin: {
                  include: {
                    addresses: {
                      take: 1,
                    },
                  },
                },
                destination: {
                  include: {
                    addresses: {
                      take: 1,
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
      include: {
        status: true,
        delivery: {
          include: {
            trackingLatest: true,
            courier: {
              include: { profile: true },
            },
            routes: {
              take: 1,
              orderBy: { createdAt: "desc" },
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
      include: {
        delivery: {
          include: {
            routes: {
              include: {
                origin: { include: { addresses: true } },
                destination: { include: { addresses: true } },
              },
            },
            trackingHistory: {
              orderBy: { recordedAt: "asc" },
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
}
