import { prisma } from "../../../../shared/config/database";
import {
  comparePassword,
  hashPassword,
} from "../../../../shared/security/hash.service";
import { createHash } from "crypto";
import {
  ISettingsRepository,
  PublicBrandingSettings,
  GeneralSettings,
  FinancialSettings,
  IntegrationSettings,
  NotificationSettings,
  AdminUserItem,
  CreateAdminInput,
  ChangeOwnPasswordInput,
  ResetAdminPasswordInput,
} from "../../domain/repositories/settings.repository";

export class SettingsRepositoryError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

export class PrismaSettingsRepository implements ISettingsRepository {
  private readonly defaultSettingKey = "DEFAULT";

  private readonly defaultNotificationChannels = [
    { code: "PUSH", name: "Push" },
    { code: "EMAIL", name: "Email" },
    { code: "CRITICAL_ALERTS", name: "Alertas críticas" },
    { code: "UNASSIGNED", name: "Sin asignar" },
  ] as const;

  private buildDocumentNumberHash(value: string): string {
    return createHash("sha256").update(value.trim()).digest("hex");
  }

  private async getOrCreateSystemSetting() {
    return prisma.systemSetting.upsert({
      where: { key: this.defaultSettingKey },
      update: {},
      create: {
        key: this.defaultSettingKey,
        createdAt: new Date(),
      },
    });
  }

  private async getOrCreateBusinessEntity() {
    const entity = await prisma.businessEntity.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (entity) return entity;

    return prisma.businessEntity.create({
      data: {
        legalName: "Delivery GO",
        tradeName: "Delivery GO",
        documentType: "NIT",
        documentNumber: `DG-${Date.now()}`,
        status: "ACTIVE",
        createdAt: new Date(),
      },
    });
  }

  private async getOrCreateFinancialSetting(businessEntityId?: string) {
    const financial = await prisma.financialSetting.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (financial) return financial;

    return prisma.financialSetting.create({
      data: {
        businessEntityId,
        defaultCurrency: "COP",
        createdAt: new Date(),
      },
    });
  }

  private async ensureDefaultNotificationChannels() {
    await Promise.all(
      this.defaultNotificationChannels.map((channel) =>
        prisma.notificationChannel.upsert({
          where: { code: channel.code },
          update: { name: channel.name, updatedAt: new Date() },
          create: {
            code: channel.code,
            name: channel.name,
            isActive: true,
            createdAt: new Date(),
          },
        }),
      ),
    );
  }

  private async ensureAdminRole() {
    return prisma.role.upsert({
      where: { name: "ADMIN" },
      update: { status: "ACTIVE", updatedAt: new Date(), deletedAt: null },
      create: {
        name: "ADMIN",
        description: "Administrador del sistema",
        status: "ACTIVE",
        createdAt: new Date(),
      },
    });
  }

  async getPublicBranding(): Promise<PublicBrandingSettings> {
    const [settings, entity] = await Promise.all([
      this.getOrCreateSystemSetting(),
      this.getOrCreateBusinessEntity(),
    ]);

    return {
      systemName: entity.tradeName ?? entity.legalName ?? "Delivery GO",
      logoUrl: settings.logoUrl ?? null,
    };
  }

  async getGeneralSettings(): Promise<GeneralSettings> {
    const entity = await this.getOrCreateBusinessEntity();
    const [settings, financial] = await Promise.all([
      this.getOrCreateSystemSetting(),
      this.getOrCreateFinancialSetting(entity.id),
    ]);

    return {
      systemName: entity.tradeName ?? entity.legalName,
      operationCity: settings.operationCity,
      timezone: settings.timezone,
      language: settings.language,
      currency: financial.defaultCurrency,
      logoUrl: settings.logoUrl ?? null,
      companyEmail: entity.contactEmail ?? null,
      supportPhone: entity.contactPhone ?? null,
    };
  }

  async updateGeneralSettings(data: Partial<GeneralSettings>): Promise<void> {
    const entity = await this.getOrCreateBusinessEntity();
    const [settings, financial] = await Promise.all([
      this.getOrCreateSystemSetting(),
      this.getOrCreateFinancialSetting(entity.id),
    ]);

    await prisma.$transaction([
      prisma.businessEntity.update({
        where: { id: entity.id },
        data: {
          ...(data.systemName !== undefined && {
            tradeName: data.systemName,
          }),
          ...(data.companyEmail !== undefined && {
            contactEmail: data.companyEmail || null,
          }),
          ...(data.supportPhone !== undefined && {
            contactPhone: data.supportPhone || null,
          }),
          updatedAt: new Date(),
        },
      }),
      prisma.systemSetting.update({
        where: { id: settings.id },
        data: {
          ...(data.operationCity !== undefined && {
            operationCity: data.operationCity,
          }),
          ...(data.timezone !== undefined && { timezone: data.timezone }),
          ...(data.language !== undefined && { language: data.language }),
          updatedAt: new Date(),
        },
      }),
      prisma.financialSetting.update({
        where: { id: financial.id },
        data: {
          ...(data.currency !== undefined && {
            defaultCurrency: data.currency,
          }),
          updatedAt: new Date(),
        },
      }),
    ]);
  }

  async getFinancialSettings(): Promise<FinancialSettings> {
    const settings = await this.getOrCreateSystemSetting();

    return {
      platformCommissionPercent: Number(settings.platformCommissionPercent),
      fixedCommissionPerOrder: Number(settings.fixedCommissionPerOrder),
      differentiatedCommissionByRestaurant:
        settings.differentiatedCommissionByRestaurant,
      withholdRiderAutomatically: settings.withholdRiderAutomatically,
      settlementMethod:
        settings.settlementMethod === "MANUAL" ? "MANUAL" : "AUTOMATIC",
    };
  }

  async updateFinancialSettings(
    data: Partial<FinancialSettings>,
  ): Promise<void> {
    const settings = await this.getOrCreateSystemSetting();

    await prisma.systemSetting.update({
      where: { id: settings.id },
      data: {
        ...(data.platformCommissionPercent !== undefined && {
          platformCommissionPercent: data.platformCommissionPercent,
        }),
        ...(data.fixedCommissionPerOrder !== undefined && {
          fixedCommissionPerOrder: data.fixedCommissionPerOrder,
        }),
        ...(data.differentiatedCommissionByRestaurant !== undefined && {
          differentiatedCommissionByRestaurant:
            data.differentiatedCommissionByRestaurant,
        }),
        ...(data.withholdRiderAutomatically !== undefined && {
          withholdRiderAutomatically: data.withholdRiderAutomatically,
        }),
        ...(data.settlementMethod !== undefined && {
          settlementMethod: data.settlementMethod,
        }),
        updatedAt: new Date(),
      },
    });
  }

  async updateSystemLogo(logoUrl: string): Promise<string> {
    const settings = await this.getOrCreateSystemSetting();

    await prisma.systemSetting.update({
      where: { id: settings.id },
      data: {
        logoUrl,
        updatedAt: new Date(),
      },
    });

    return logoUrl;
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
    await this.ensureDefaultNotificationChannels();

    const channels = await prisma.notificationChannel.findMany({
      where: {
        code: {
          in: this.defaultNotificationChannels.map((channel) => channel.code),
        },
      },
    });

    const byCode = new Map(channels.map((channel) => [channel.code, channel]));

    return {
      channels: this.defaultNotificationChannels.map((defaultChannel) => ({
        code: defaultChannel.code,
        name: defaultChannel.name,
        isActive: byCode.get(defaultChannel.code)?.isActive ?? true,
      })),
    };
  }

  async updateNotificationSettings(
    channels: { code: string; isActive: boolean }[],
  ): Promise<void> {
    await this.ensureDefaultNotificationChannels();

    await prisma.$transaction(
      channels.map((ch) =>
        prisma.notificationChannel.updateMany({
          where: { code: ch.code },
          data: { isActive: ch.isActive, updatedAt: new Date() },
        }),
      ),
    );
  }

  async getAdminUsers(): Promise<AdminUserItem[]> {
    const admins = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        userRoles: {
          some: {
            status: "ACTIVE",
            deletedAt: null,
            role: {
              name: "ADMIN",
              status: "ACTIVE",
              deletedAt: null,
            },
          },
        },
      },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    return admins.map((admin, index) => ({
      id: admin.id,
      firstName: admin.profile?.firstName ?? "Admin",
      lastName: admin.profile?.lastName ?? "",
      email: admin.email,
      roleLabel: index === 1 ? "Super Admin" : "Administrador",
      status: admin.status,
    }));
  }

  async createAdmin(data: CreateAdminInput): Promise<AdminUserItem> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (existing) {
      throw new SettingsRepositoryError(
        "Ya existe un usuario con ese correo",
        409,
      );
    }

    const [passwordHash, adminRole] = await Promise.all([
      hashPassword(data.password),
      this.ensureAdminRole(),
    ]);

    const now = new Date();
    const documentNumberHash = this.buildDocumentNumberHash(data.email);

    const created = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        status: "ACTIVE",
        emailVerified: true,
        createdAt: now,
        profile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            documentType: "CC",
            documentNumberEncrypted: Buffer.from(data.email),
            documentNumberHash,
            createdAt: now,
          },
        },
        userRoles: {
          create: {
            roleId: adminRole.id,
            assignedAt: now,
            status: "ACTIVE",
          },
        },
      },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      id: created.id,
      firstName: created.profile?.firstName ?? data.firstName,
      lastName: created.profile?.lastName ?? data.lastName,
      email: created.email,
      roleLabel: "Administrador",
      status: created.status,
    };
  }

  async changeOwnPassword(
    userId: string,
    data: ChangeOwnPasswordInput,
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new SettingsRepositoryError("Usuario no encontrado", 404);
    }

    const validCurrentPassword = await comparePassword(
      data.currentPassword,
      user.passwordHash,
    );

    if (!validCurrentPassword) {
      throw new SettingsRepositoryError(
        "La contraseña actual es inválida",
        400,
      );
    }

    const newPasswordHash = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });
  }

  async resetAdminPassword(data: ResetAdminPasswordInput): Promise<void> {
    const admin = await prisma.user.findFirst({
      where: {
        id: data.adminId,
        deletedAt: null,
        status: "ACTIVE",
        userRoles: {
          some: {
            status: "ACTIVE",
            deletedAt: null,
            role: {
              name: "ADMIN",
              status: "ACTIVE",
              deletedAt: null,
            },
          },
        },
      },
      select: { id: true },
    });

    if (!admin) {
      throw new SettingsRepositoryError("Administrador no encontrado", 404);
    }

    const newPasswordHash = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });
  }
}
