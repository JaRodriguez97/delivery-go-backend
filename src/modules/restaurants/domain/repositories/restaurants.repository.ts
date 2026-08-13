import {
  PaginationParams,
  PaginatedResponse,
} from "../../../../shared/utils/pagination";

export interface RestaurantListItem {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  createdAt: Date;
}

export interface RestaurantDetail {
  id: string;
  name: string;
  description: string | null;
  licenseNumber: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  } | null;
  status: string;
  schedules: {
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
  }[];
  documents: {
    id: string;
    documentType: string;
    documentUrl: string;
    verified: boolean;
  }[];
  createdAt: Date;
}

export interface RestaurantsKpis {
  active: number;
  inactive: number;
  pending: number;
}

export interface RestaurantFilters {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface IRestaurantsRepository {
  getKpis(): Promise<RestaurantsKpis>;
  getRestaurants(
    filters: RestaurantFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<RestaurantListItem>>;
  getRestaurantById(id: string): Promise<RestaurantDetail | null>;
  createRestaurant(data: {
    name: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
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
  } ): Promise<{ id: string }>;
  registerRestaurant(data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    passwordHash: string;
    restaurantName: string;
    address: string;
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
    licenseNumber?: string;
    deliveryEnabled?: boolean | string;
    prepTimeMinutes?: number | string;
    cuisineTypes?: string[] | string;
    description?: string;
    businessLicenseUrl?: string;
  }): Promise<{ id: string }>;
  reviewRestaurant(
    id: string,
    data: { action: "APPROVE" | "REJECT"; notes?: string },
  ): Promise<void>;
  toggleRestaurantStatus(id: string): Promise<void>;
  updateRestaurant(
    id: string,
    data: {
      name?: string;
      description?: string;
      phone?: string;
      email?: string;
      address?: string;
      neighborhood?: string;
      latitude?: number;
      longitude?: number;
      statusId?: string;
    },
  ): Promise<void>;
  deleteRestaurant(id: string): Promise<void>;
  getRestaurantByUserId(userId: string): Promise<RestaurantDetail | null>;
  getPublicRestaurants(): Promise<PublicRestaurantItem[]>;
}

export interface PublicRestaurantItem {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}
