export interface OrderTrackingResult {
  orderId: string;
  status: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  } | null;
  estimatedDeliveryTime: Date | null;
  deliveryDistance: number | null;
  riderId: string | null;
  riderLocation: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  } | null;
}

export interface RiderTrackingResult {
  riderId: string;
  name: string;
  isOnline: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  } | null;
  activeDeliveries: {
    deliveryId: string;
    orderId: string | null;
    status: string | null;
  }[];
}

export interface RoutePointResult {
  latitude: number;
  longitude: number;
  type: "start" | "waypoint" | "destination";
  address?: string;
}

export type ActiveDeliveryFilter = "ALL" | "ONLINE" | "OFFLINE" | "IN_DELIVERY";

export interface ActiveDeliveryResult {
  deliveryId: string;
  orderId: string;
  status: string;
  elapsedMinutes: number | null;
  restaurantName: string | null;
  riderId: string | null;
  riderName: string | null;
  riderAvatarUrl: string | null;
  isRiderOnline: boolean;
  pickupAddress: string | null;
  pickupLocation: {
    latitude: number;
    longitude: number;
  } | null;
  destinationAddress: string | null;
  riderLocation: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  } | null;
}

export interface ActiveRiderResult {
  riderId: string;
  riderName: string | null;
  riderAvatarUrl: string | null;
  isOnline: boolean;
  lastSeen: Date | null;
  riderLocation: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  } | null;
}

export interface TrackingSnapshotResult {
  deliveries: ActiveDeliveryResult[];
  riders: ActiveRiderResult[];
}

export interface ITrackingRepository {
  getActiveDeliveries(params?: {
    search?: string;
    filter?: ActiveDeliveryFilter;
    limit?: number;
  }): Promise<ActiveDeliveryResult[]>;
  getOrderTracking(orderId: string): Promise<OrderTrackingResult | null>;
  getActiveRiders(params?: {
    search?: string;
    filter?: ActiveDeliveryFilter;
    limit?: number;
  }): Promise<ActiveRiderResult[]>;
  getRiderTracking(riderId: string): Promise<RiderTrackingResult | null>;
  getDeliveryRoute(orderId: string): Promise<RoutePointResult[]>;
  updateCourierLocationByUserId(params: {
    userId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    recordedAt?: Date;
  }): Promise<{ deliveryId: string }>;
  getSnapshot(params?: {
    search?: string;
    filter?: ActiveDeliveryFilter;
    deliveriesLimit?: number;
    ridersLimit?: number;
  }): Promise<TrackingSnapshotResult>;
}
