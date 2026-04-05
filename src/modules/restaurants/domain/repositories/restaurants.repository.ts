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
  status: string;
  createdAt: Date;
}

export interface RestaurantDetail {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
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
    owner: {
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
    };
  }): Promise<{ id: string }>;
  updateRestaurant(
    id: string,
    data: {
      name?: string;
      description?: string;
      phone?: string;
      email?: string;
      statusId?: string;
    },
  ): Promise<void>;
  deleteRestaurant(id: string): Promise<void>;
}
