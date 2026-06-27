export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  status: string;
  emailVerified: boolean;
  accountLocked: boolean;
  lockedUntil: Date | null;
}

export interface AuthUserWithProfile extends AuthUser {
  firstName: string;
  lastName: string;
  roles: string[];
  role: string;
  restaurantId: string | null;
  courierId: string | null;
}

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<AuthUserWithProfile | null>;
  findUserById(id: string): Promise<AuthUserWithProfile | null>;
  createSession(data: {
    userId: string;
    token: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<void>;
  revokeSession(token: string): Promise<void>;
  findActiveSession(token: string): Promise<{ userId: string } | null>;
  createAuditLog(data: {
    userId?: string;
    action: string;
    success: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void>;
}
