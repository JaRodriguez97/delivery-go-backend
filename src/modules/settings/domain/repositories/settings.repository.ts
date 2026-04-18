export interface GeneralSettings {
  systemName: string;
  operationCity: string;
  timezone: string;
  language: string;
  currency: string;
  logoUrl: string | null;
  companyEmail: string | null;
  supportPhone: string | null;
}

export interface FinancialSettings {
  platformCommissionPercent: number;
  fixedCommissionPerOrder: number;
  differentiatedCommissionByRestaurant: boolean;
  withholdRiderAutomatically: boolean;
  settlementMethod: "AUTOMATIC" | "MANUAL";
}

export interface IntegrationSettings {
  paymentGateways: {
    id: string;
    code: string;
    name: string;
    environment: string;
    status: string;
  }[];
}

export interface NotificationSettings {
  channels: {
    code: string;
    name: string;
    isActive: boolean;
  }[];
}

export interface PublicBrandingSettings {
  systemName: string;
  logoUrl: string | null;
}

export interface AdminUserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleLabel: string;
  status: string;
}

export interface CreateAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface ChangeOwnPasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ResetAdminPasswordInput {
  adminId: string;
  newPassword: string;
}

export interface ISettingsRepository {
  getPublicBranding(): Promise<PublicBrandingSettings>;

  getGeneralSettings(): Promise<GeneralSettings>;
  updateGeneralSettings(data: Partial<GeneralSettings>): Promise<void>;

  getFinancialSettings(): Promise<FinancialSettings>;
  updateFinancialSettings(data: Partial<FinancialSettings>): Promise<void>;

  updateSystemLogo(logoUrl: string): Promise<string>;

  getIntegrationSettings(): Promise<IntegrationSettings>;

  getNotificationSettings(): Promise<NotificationSettings>;
  updateNotificationSettings(
    channels: { code: string; isActive: boolean }[],
  ): Promise<void>;

  getAdminUsers(): Promise<AdminUserItem[]>;
  createAdmin(data: CreateAdminInput): Promise<AdminUserItem>;
  changeOwnPassword(
    userId: string,
    data: ChangeOwnPasswordInput,
  ): Promise<void>;
  resetAdminPassword(data: ResetAdminPasswordInput): Promise<void>;
}
