import { prisma } from "../../../../shared/config/database";
import {
  ITariffsRepository,
  TariffListItem,
  TariffDetail,
  FeeCalculation,
  TariffChangeLogItem,
} from "../../domain/repositories/tariffs.repository";

export class PrismaTariffsRepository implements ITariffsRepository {
  private normalizeRoundingMode(
    mode: string | null | undefined,
  ): "NONE" | "HALF" | "INTEGER" {
    if (mode === "NONE" || mode === "HALF" || mode === "INTEGER") {
      return mode;
    }

    return "HALF";
  }

  private applyRounding(
    amount: number,
    mode: "NONE" | "HALF" | "INTEGER",
  ): number {
    if (mode === "INTEGER") {
      return Math.round(amount);
    }

    if (mode === "HALF") {
      return Math.round(amount * 2) / 2;
    }

    return Math.round(amount * 100) / 100;
  }

  async getTariffs(): Promise<TariffListItem[]> {
    const rates = await prisma.deliveryRate.findMany({
      include: { _count: { select: { rules: true } } },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }, { name: "asc" }],
    });

    return rates.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      baseFee: r.baseFee ? Number(r.baseFee) : null,
      perKmFee: r.perKmFee ? Number(r.perKmFee) : null,
      minimumFee: r.minimumFee ? Number(r.minimumFee) : null,
      maximumFee: r.maximumFee ? Number(r.maximumFee) : null,
      minimumRadiusKm: r.minimumRadiusKm ? Number(r.minimumRadiusKm) : null,
      autoRounding: r.autoRounding,
      dynamicPricingEnabled: r.dynamicPricingEnabled,
      currency: r.currency,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
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
      description: rate.description,
      baseFee: rate.baseFee ? Number(rate.baseFee) : null,
      perKmFee: rate.perKmFee ? Number(rate.perKmFee) : null,
      minimumFee: rate.minimumFee ? Number(rate.minimumFee) : null,
      maximumFee: rate.maximumFee ? Number(rate.maximumFee) : null,
      minimumRadiusKm: rate.minimumRadiusKm
        ? Number(rate.minimumRadiusKm)
        : null,
      autoRounding: rate.autoRounding,
      dynamicPricingEnabled: rate.dynamicPricingEnabled,
      currency: rate.currency,
      isActive: rate.isActive,
      createdAt: rate.createdAt,
      updatedAt: rate.updatedAt,
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

  async getTariffChangeHistory(limit = 20): Promise<TariffChangeLogItem[]> {
    const safeLimit = Math.min(100, Math.max(1, limit));

    const changes = await prisma.deliveryRateChangeLog.findMany({
      take: safeLimit,
      orderBy: { changedAt: "desc" },
      include: {
        rate: {
          select: {
            name: true,
          },
        },
      },
    });

    return changes.map((item) => ({
      id: item.id,
      rateId: item.rateId,
      rateName: item.rate?.name ?? null,
      previousBaseFee: item.previousBaseFee
        ? Number(item.previousBaseFee)
        : null,
      newBaseFee: item.newBaseFee ? Number(item.newBaseFee) : null,
      previousPerKmFee: item.previousPerKmFee
        ? Number(item.previousPerKmFee)
        : null,
      newPerKmFee: item.newPerKmFee ? Number(item.newPerKmFee) : null,
      changedAt: item.changedAt,
    }));
  }

  async createTariff(data: {
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
  }): Promise<{ id: string }> {
    const now = new Date();

    const rate = await prisma.deliveryRate.create({
      data: {
        name: data.name,
        description: data.description,
        baseFee: data.baseFee,
        perKmFee: data.perKmFee,
        minimumFee: data.minimumFee,
        maximumFee: data.maximumFee,
        minimumRadiusKm: data.minimumRadiusKm ?? 1,
        autoRounding: data.autoRounding ?? "HALF",
        dynamicPricingEnabled: data.dynamicPricingEnabled ?? true,
        currency: data.currency ?? "COP",
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      },
    });
    return { id: rate.id };
  }

  async updateTariff(id: string, data: Record<string, unknown>): Promise<void> {
    const currentRate = await prisma.deliveryRate.findUnique({
      where: { id },
    });

    if (!currentRate) {
      throw new Error("Tarifa no encontrada");
    }

    const nextBaseFee =
      data.baseFee !== undefined
        ? Number(data.baseFee)
        : currentRate.baseFee
          ? Number(currentRate.baseFee)
          : null;
    const nextPerKmFee =
      data.perKmFee !== undefined
        ? Number(data.perKmFee)
        : currentRate.perKmFee
          ? Number(currentRate.perKmFee)
          : null;

    const shouldLogChange =
      data.baseFee !== undefined || data.perKmFee !== undefined;

    await prisma.$transaction(async (tx) => {
      await tx.deliveryRate.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name as string }),
          ...(data.description !== undefined && {
            description: data.description as string,
          }),
          ...(data.baseFee !== undefined && { baseFee: Number(data.baseFee) }),
          ...(data.perKmFee !== undefined && {
            perKmFee: Number(data.perKmFee),
          }),
          ...(data.minimumFee !== undefined && {
            minimumFee: Number(data.minimumFee),
          }),
          ...(data.maximumFee !== undefined && {
            maximumFee: Number(data.maximumFee),
          }),
          ...(data.minimumRadiusKm !== undefined && {
            minimumRadiusKm: Number(data.minimumRadiusKm),
          }),
          ...(data.autoRounding !== undefined && {
            autoRounding: data.autoRounding as string,
          }),
          ...(data.dynamicPricingEnabled !== undefined && {
            dynamicPricingEnabled: data.dynamicPricingEnabled as boolean,
          }),
          ...(data.currency !== undefined && {
            currency: data.currency as string,
          }),
          ...(data.isActive !== undefined && {
            isActive: data.isActive as boolean,
          }),
          updatedAt: new Date(),
        },
      });

      if (shouldLogChange) {
        await tx.deliveryRateChangeLog.create({
          data: {
            rateId: id,
            previousBaseFee: currentRate.baseFee,
            newBaseFee: nextBaseFee,
            previousPerKmFee: currentRate.perKmFee,
            newPerKmFee: nextPerKmFee,
            changedAt: new Date(),
          },
        });
      }
    });
  }

  async deleteTariff(id: string): Promise<void> {
    await prisma.deliveryRate.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
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
    const minimumRadiusKm = activeRate.minimumRadiusKm
      ? Number(activeRate.minimumRadiusKm)
      : 0;
    const chargedDistance = Math.max(distance, minimumRadiusKm);

    let multiplier = 1;
    if (activeRate.dynamicPricingEnabled !== false) {
      for (const rule of activeRate.rules) {
        const min = rule.minDistanceKm ? Number(rule.minDistanceKm) : 0;
        const max = rule.maxDistanceKm ? Number(rule.maxDistanceKm) : Infinity;
        if (
          chargedDistance >= min &&
          chargedDistance <= max &&
          rule.multiplier
        ) {
          multiplier = Number(rule.multiplier);
          break;
        }
      }
    }

    let calculatedFee = (baseFee + perKmFee * chargedDistance) * multiplier;
    const minimumFee = activeRate.minimumFee
      ? Number(activeRate.minimumFee)
      : null;
    const maximumFee = activeRate.maximumFee
      ? Number(activeRate.maximumFee)
      : null;

    if (minimumFee !== null) {
      calculatedFee = Math.max(calculatedFee, minimumFee);
    }

    if (maximumFee !== null) {
      calculatedFee = Math.min(calculatedFee, maximumFee);
    }

    const autoRounding = this.normalizeRoundingMode(activeRate.autoRounding);
    calculatedFee = this.applyRounding(calculatedFee, autoRounding);

    return {
      baseFee,
      perKmFee,
      distance,
      chargedDistance,
      multiplier,
      minimumFee,
      maximumFee,
      autoRounding,
      calculatedFee,
      rateName: activeRate.name ?? "default",
    };
  }
}
