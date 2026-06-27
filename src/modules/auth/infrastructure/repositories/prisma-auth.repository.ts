import { prisma } from "../../../../shared/config/database";
import {
  IAuthRepository,
  AuthUserWithProfile,
} from "../../domain/repositories/auth.repository";

export class PrismaAuthRepository implements IAuthRepository {
  async findUserByEmail(email: string): Promise<AuthUserWithProfile | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: { select: { firstName: true, lastName: true } },
        userRoles: {
          where: { status: "ACTIVE" },
          include: { role: { select: { name: true } } },
        },
      },
    });

    if (!user) return null;

    const roles = user.userRoles.map((ur) => ur.role.name);
    const [restaurant, courier] = await Promise.all([
      prisma.restaurant.findFirst({
        where: { owner: { userId: user.id } },
        select: { id: true },
      }),
      prisma.courier.findFirst({
        where: { userId: user.id },
        select: { id: true },
      }),
    ]);

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      status: user.status,
      emailVerified: user.emailVerified,
      accountLocked: user.accountLocked,
      lockedUntil: user.lockedUntil,
      firstName: user.profile?.firstName ?? "",
      lastName: user.profile?.lastName ?? "",
      roles,
      role: roles[0] ?? "CUSTOMER",
      restaurantId: restaurant?.id ?? null,
      courierId: courier?.id ?? null,
    };
  }

  async findUserById(id: string): Promise<AuthUserWithProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: { select: { firstName: true, lastName: true } },
        userRoles: {
          where: { status: "ACTIVE" },
          include: { role: { select: { name: true } } },
        },
      },
    });

    if (!user) return null;

    const roles = user.userRoles.map((ur) => ur.role.name);
    const [restaurant, courier] = await Promise.all([
      prisma.restaurant.findFirst({
        where: { owner: { userId: user.id } },
        select: { id: true },
      }),
      prisma.courier.findFirst({
        where: { userId: user.id },
        select: { id: true },
      }),
    ]);

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      status: user.status,
      emailVerified: user.emailVerified,
      accountLocked: user.accountLocked,
      lockedUntil: user.lockedUntil,
      firstName: user.profile?.firstName ?? "",
      lastName: user.profile?.lastName ?? "",
      roles,
      role: roles[0] ?? "CUSTOMER",
      restaurantId: restaurant?.id ?? null,
      courierId: courier?.id ?? null,
    };
  }

  async createSession(data: {
    userId: string;
    token: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.session.create({
      data: {
        userId: data.userId,
        token: data.token,
        ipAddress: data.ipAddress,
        createdAt: new Date(),
        expiresAt: data.expiresAt,
        status: "ACTIVE",
      },
    });
  }

  async revokeSession(token: string): Promise<void> {
    await prisma.session.updateMany({
      where: { token, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
  }

  async findActiveSession(token: string): Promise<{ userId: string } | null> {
    return prisma.session.findFirst({
      where: { token, status: "ACTIVE", expiresAt: { gt: new Date() } },
      select: { userId: true },
    });
  }

  async createAuditLog(data: {
    userId?: string;
    action: string;
    success: boolean;
    failureReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await prisma.accessAudit.create({
      data: {
        userId: data.userId,
        action: data.action as any,
        success: data.success,
        failureReason: data.failureReason as any,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        occurredAt: new Date(),
      },
    });
  }
}
