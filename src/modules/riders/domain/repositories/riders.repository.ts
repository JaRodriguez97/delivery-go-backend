import {
  PaginationParams,
  PaginatedResponse,
} from "../../../../shared/utils/pagination";

export interface RiderListItem {
  id: string;
  name: string;
  phone: string;
  vehicleType: string | null;
  vehicleDescription: string | null;
  zone: string | null;
  status: string;
  isOnline: boolean;
  currentOrders: number;
  totalOrders: number;
}

export interface RiderDetail {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  status: string;
  isOnline: boolean;
  documentNumber: string | null;
  vehicle: {
    type: string;
    brand: string;
    model: string;
    plate: string;
    serialNumber: string;
    year: number | null;
    color: string;
  } | null;
  documents: {
    id: string;
    documentType: string;
    documentUrl: string;
    verified: boolean;
  }[];
  zones: { id: string; geofenceName: string }[];
  createdAt: Date;
}

export interface RidersKpis {
  active: number;
  inactive: number;
  online: number;
  inOrder: number;
  pendingRegistration: number;
}

export interface RiderFilters {
  search?: string;
  phone?: string;
  status?: string;
  isOnline?: boolean;
  inOrder?: boolean;
}

export interface IRidersRepository {
  getKpis(): Promise<RidersKpis>;
  getRiders(
    filters: RiderFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<RiderListItem>>;
  getRiderById(id: string): Promise<RiderDetail | null>;
  createRider(data: {
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
  }): Promise<{ id: string }>;
  registerRider(data: {
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
  }): Promise<{ id: string }>;
  reviewRider(
    id: string,
    data: { action: "APPROVE" | "REJECT"; notes?: string },
  ): Promise<void>;
  updateRider(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
      status?: string;
    },
  ): Promise<void>;
  deleteRider(id: string): Promise<void>;
}
