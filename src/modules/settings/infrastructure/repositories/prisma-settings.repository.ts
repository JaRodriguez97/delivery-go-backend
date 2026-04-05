import { prisma } from "../../../../shared/config/database";
import {
  ISettingsRepository,
  GeneralSettings,
  IntegrationSettings,
  NotificationSettings,
} from "../../domain/repositories/settings.repository";

export class PrismaSettingsRepository implements ISettingsRepository {
  async getGeneralSettings(): Promise<GeneralSettings> {
    const entity = await prisma.businessEntity.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    const financial = await prisma.financialSetting.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    return {
      companyName: entity?.tradeName ?? entity?.legalName ?? "Delivery GO",
      companyEmail: entity?.contactEmail ?? null,
      supportPhone: entity?.contactPhone ?? null,
      timezone: "America/Bogota",
      language: "es",
      currency: financial?.defaultCurrency ?? "COP",
      maintenanceMode: false,
    };
  }

  async updateGeneralSettings(data: Partial<GeneralSettings>): Promise<void> {
    const entity = await prisma.businessEntity.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (entity) {
      await prisma.businessEntity.update({
        where: { id: entity.id },
        data: {
          ...(data.companyName !== undefined && {
            tradeName: data.companyName,
          }),
          ...(data.companyEmail !== undefined && {
            contactEmail: data.companyEmail,
          }),
          ...(data.supportPhone !== undefined && {
            contactPhone: data.supportPhone,
          }),
          updatedAt: new Date(),
        },
      });
    }

    if (data.currency) {
      const financial = await prisma.financialSetting.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      });
      if (financial) {
        await prisma.financialSetting.update({
          where: { id: financial.id },
          data: { defaultCurrency: data.currency, updatedAt: new Date() },
        });
      }
    }
  }

  async getIntegrationSettings(): Promise<IntegrationSettings> {
    const gateways = await prisma.gatewayProvider.findMany({
      orderBy: { name: "asc" },
    });

    return {
      paymentGateways: gateways.map((g) => ({
        id: g.id,
        code: g.code,
        name: g.name,
        environment: g.environment,
        status: g.status,
      })),
    };
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    const channels = await prisma.notificationChannel.findMany({
      orderBy: { name: "asc" },
    });

    return {
      channels: channels.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        isActive: c.isActive ?? true,
      })),
    };
  }

  async updateNotificationSettings(
    channels: { id: string; isActive: boolean }[],
  ): Promise<void> {
    await prisma.$transaction(
      channels.map((ch) =>
        prisma.notificationChannel.update({
          where: { id: ch.id },
          data: { isActive: ch.isActive, updatedAt: new Date() },
        }),
      ),
    );
  }
}
