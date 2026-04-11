export interface TariffListItem {
  id: string;
  name: string | null;
  description: string | null;
  baseFee: number | null;
  perKmFee: number | null;
  minimumFee: number | null;
  maximumFee: number | null;
  minimumRadiusKm: number | null;
  autoRounding: string | null;
  dynamicPricingEnabled: boolean | null;
  currency: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  rulesCount: number;
}

export interface TariffDetail extends TariffListItem {
  rules: {
    id: string;
    minDistanceKm: number | null;
    maxDistanceKm: number | null;
    multiplier: number | null;
    geofenceId: string | null;
  }[];
}

export interface FeeCalculation {
  baseFee: number;
  perKmFee: number;
  distance: number;
  chargedDistance: number;
  multiplier: number;
  minimumFee: number | null;
  maximumFee: number | null;
  autoRounding: string;
  calculatedFee: number;
  rateName: string;
}

export interface TariffChangeLogItem {
  id: string;
  rateId: string | null;
  rateName: string | null;
  previousBaseFee: number | null;
  newBaseFee: number | null;
  previousPerKmFee: number | null;
  newPerKmFee: number | null;
  changedAt: Date | null;
}

export interface ITariffsRepository {
  getTariffs(): Promise<TariffListItem[]>;
  getTariffById(id: string): Promise<TariffDetail | null>;
  getTariffChangeHistory(limit?: number): Promise<TariffChangeLogItem[]>;
  createTariff(data: {
    name: string;
    description?: string;
    baseFee: number;
    perKmFee: number;
    minimumFee?: number;
    maximumFee?: number;
    minimumRadiusKm?: number;
    autoRounding?: "NONE" | "HALF" | "INTEGER";
    dynamicPricingEnabled?: boolean;
    currency?: string;
    isActive?: boolean;
  }): Promise<{ id: string }>;
  updateTariff(id: string, data: Record<string, unknown>): Promise<void>;
  deleteTariff(id: string): Promise<void>;
  calculateFee(distance: number): Promise<FeeCalculation | null>;
}
