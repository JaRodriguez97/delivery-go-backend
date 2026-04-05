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

export interface ITrackingRepository {
  getOrderTracking(orderId: string): Promise<OrderTrackingResult | null>;
  getRiderTracking(riderId: string): Promise<RiderTrackingResult | null>;
  getDeliveryRoute(orderId: string): Promise<RoutePointResult[]>;
}
