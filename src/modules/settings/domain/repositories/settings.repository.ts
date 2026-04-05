export interface GeneralSettings {
  companyName: string | null;
  companyEmail: string | null;
  supportPhone: string | null;
  timezone: string;
  language: string;
  currency: string;
  maintenanceMode: boolean;
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
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  }[];
}

export interface ISettingsRepository {
  getGeneralSettings(): Promise<GeneralSettings>;
  updateGeneralSettings(data: Partial<GeneralSettings>): Promise<void>;
  getIntegrationSettings(): Promise<IntegrationSettings>;
  getNotificationSettings(): Promise<NotificationSettings>;
  updateNotificationSettings(
    channels: { id: string; isActive: boolean }[],
  ): Promise<void>;
}
