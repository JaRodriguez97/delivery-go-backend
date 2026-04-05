import { prisma } from "../../../../shared/config/database";
import {
  ITariffsRepository,
  TariffListItem,
  TariffDetail,
  FeeCalculation,
} from "../../domain/repositories/tariffs.repository";

export class PrismaTariffsRepository implements ITariffsRepository {
  async getTariffs(): Promise<TariffListItem[]> {
    const rates = await prisma.deliveryRate.findMany({
      include: { _count: { select: { rules: true } } },
      orderBy: { name: "asc" },
    });

    return rates.map((r) => ({
      id: r.id,
      name: r.name,
      baseFee: r.baseFee ? Number(r.baseFee) : null,
      perKmFee: r.perKmFee ? Number(r.perKmFee) : null,
      currency: r.currency,
      isActive: r.isActive,
      rulesCount: r._count.rules,
    }));
  }

  async getTariffById(id: string): Promise<TariffDetail | null> {
    const rate = await prisma.deliveryRate.findUnique({
      where: { id },
      include: {
        rules: true,
        _count: { select: { rules: true } },
      },
    });

    if (!rate) return null;

    return {
      id: rate.id,
      name: rate.name,
      baseFee: rate.baseFee ? Number(rate.baseFee) : null,
      perKmFee: rate.perKmFee ? Number(rate.perKmFee) : null,
      currency: rate.currency,
      isActive: rate.isActive,
      rulesCount: rate._count.rules,
      rules: rate.rules.map((r) => ({
        id: r.id,
        minDistanceKm: r.minDistanceKm ? Number(r.minDistanceKm) : null,
        maxDistanceKm: r.maxDistanceKm ? Number(r.maxDistanceKm) : null,
        multiplier: r.multiplier ? Number(r.multiplier) : null,
        geofenceId: r.geofenceId,
      })),
    };
  }

  async createTariff(data: {
    name: string;
    baseFee: number;
    perKmFee: number;
    currency?: string;
    isActive?: boolean;
  }): Promise<{ id: string }> {
    const rate = await prisma.deliveryRate.create({
      data: {
        name: data.name,
        baseFee: data.baseFee,
        perKmFee: data.perKmFee,
        currency: data.currency ?? "COP",
        isActive: data.isActive ?? true,
      },
    });
    return { id: rate.id };
  }

  async updateTariff(id: string, data: Record<string, unknown>): Promise<void> {
    await prisma.deliveryRate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name as string }),
        ...(data.baseFee !== undefined && { baseFee: data.baseFee as number }),
        ...(data.perKmFee !== undefined && {
          perKmFee: data.perKmFee as number,
        }),
        ...(data.currency !== undefined && {
          currency: data.currency as string,
        }),
        ...(data.isActive !== undefined && {
          isActive: data.isActive as boolean,
        }),
      },
    });
  }

  async deleteTariff(id: string): Promise<void> {
    await prisma.deliveryRate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async calculateFee(distance: number): Promise<FeeCalculation | null> {
    const activeRate = await prisma.deliveryRate.findFirst({
      where: { isActive: true },
      include: {
        rules: {
          orderBy: { minDistanceKm: "asc" },
        },
      },
    });

    if (!activeRate || !activeRate.baseFee || !activeRate.perKmFee) return null;

    const baseFee = Number(activeRate.baseFee);
    const perKmFee = Number(activeRate.perKmFee);

    let multiplier = 1;
    for (const rule of activeRate.rules) {
      const min = rule.minDistanceKm ? Number(rule.minDistanceKm) : 0;
      const max = rule.maxDistanceKm ? Number(rule.maxDistanceKm) : Infinity;
      if (distance >= min && distance <= max && rule.multiplier) {
        multiplier = Number(rule.multiplier);
        break;
      }
    }

    const calculatedFee = (baseFee + perKmFee * distance) * multiplier;

    return {
      baseFee,
      perKmFee,
      distance,
      multiplier,
      calculatedFee: Math.round(calculatedFee * 100) / 100,
      rateName: activeRate.name ?? "default",
    };
  }
}
