export interface TariffListItem {
  id: string;
  name: string | null;
  baseFee: number | null;
  perKmFee: number | null;
  currency: string | null;
  isActive: boolean | null;
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
  multiplier: number;
  calculatedFee: number;
  rateName: string;
}

export interface ITariffsRepository {
  getTariffs(): Promise<TariffListItem[]>;
  getTariffById(id: string): Promise<TariffDetail | null>;
  createTariff(data: {
    name: string;
    baseFee: number;
    perKmFee: number;
    currency?: string;
    isActive?: boolean;
  }): Promise<{ id: string }>;
  updateTariff(id: string, data: Record<string, unknown>): Promise<void>;
  deleteTariff(id: string): Promise<void>;
  calculateFee(distance: number): Promise<FeeCalculation | null>;
}
