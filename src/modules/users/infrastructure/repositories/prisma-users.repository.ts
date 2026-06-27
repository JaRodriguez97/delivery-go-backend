import { prisma } from "../../../../shared/config/database";
import { CreateUserDto, UpdateUserDto } from "../../application/dtos/users.dto";
import { IUsersRepository } from "../../domain/repositories/users.repository";
import { hashPassword } from "../../../../shared/security/hash.service";
import { createHash } from "crypto";

function buildDocumentNumberHash(value: string): string {
  return createHash("sha256").update(value.trim()).digest("hex");
}

export class PrismaUsersRepository implements IUsersRepository {
  async getUsers(
    filters: {
      role?: string;
      search?: string;
    },
    pagination: {
      page: number;
      limit: number;
    }
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, pagination.page);
    const limit = Math.max(1, pagination.limit);
    const skip = (page - 1) * limit;

    const searchNormalized = filters.search?.trim().toLowerCase() ?? "";

    // Construir la condición 'where' para Prisma
    const whereClause: any = {
      deletedAt: null,
    };

    if (filters.role) {
      whereClause.userRoles = {
        some: {
          role: {
            name: filters.role,
          },
          deletedAt: null,
        },
      };
    }

    if (searchNormalized) {
      whereClause.OR = [
        { email: { contains: searchNormalized, mode: "insensitive" } },
        {
          profile: {
            OR: [
              { firstName: { contains: searchNormalized, mode: "insensitive" } },
              { lastName: { contains: searchNormalized, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          profile: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      }),
    ]);

    // Mapear para devolver un formato limpio
    const data = users.map((u) => {
      const roles = u.userRoles.map((ur) => ur.role.name);
      return {
        id: u.id,
        email: u.email,
        status: u.status,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        roles,
        profile: u.profile
          ? {
              firstName: u.profile.firstName,
              lastName: u.profile.lastName,
              phone: u.profile.phone,
              address: u.profile.address,
              city: u.profile.city,
              documentType: u.profile.documentType,
              documentNumber: u.profile.documentNumberEncrypted
                ? Buffer.from(u.profile.documentNumberEncrypted).toString("utf-8")
                : null,
            }
          : null,
      };
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getUserById(id: string): Promise<any | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    const roles = user.userRoles.map((ur) => ur.role.name);

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      roles,
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            phone: user.profile.phone,
            address: user.profile.address,
            city: user.profile.city,
            documentType: user.profile.documentType,
            documentNumber: user.profile.documentNumberEncrypted
              ? Buffer.from(user.profile.documentNumberEncrypted).toString("utf-8")
              : null,
          }
        : null,
    };
  }

  async createUser(data: CreateUserDto): Promise<any> {
    const hashedPassword = await hashPassword(data.password);
    const docNumber = data.documentNumber?.trim() || `DOC-${Date.now()}`;
    const docHash = buildDocumentNumberHash(docNumber);

    return prisma.$transaction(async (tx) => {
      // 1. Crear el usuario
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash: hashedPassword,
          status: "ACTIVE",
          emailVerified: true,
          createdAt: new Date(),
        },
      });

      // 2. Crear su perfil
      await tx.userProfile.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          address: data.address,
          city: data.city,
          documentType: data.documentType || "CC",
          documentNumberEncrypted: Buffer.from(docNumber),
          documentNumberHash: docHash,
          createdAt: new Date(),
        },
      });

      // 3. Buscar o crear el rol
      let role = await tx.role.findUnique({
        where: { name: data.role },
      });

      if (!role) {
        role = await tx.role.create({
          data: {
            name: data.role,
            description: `Rol de tipo ${data.role}`,
            createdAt: new Date(),
          },
        });
      }

      // 4. Asignar el rol
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
          assignedAt: new Date(),
          status: "ACTIVE",
        },
      });

      return {
        id: user.id,
        email: user.email,
        role: data.role,
      };
    });
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<any> {
    const updateData: any = {};

    if (data.email) {
      updateData.email = data.email.toLowerCase().trim();
    }
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }
    if (data.status) {
      updateData.status = data.status;
    }

    updateData.updatedAt = new Date();

    return prisma.$transaction(async (tx) => {
      // 1. Actualizar usuario básico
      const user = await tx.user.update({
        where: { id },
        data: updateData,
      });

      // 2. Actualizar perfil
      const profileData: any = {};
      if (data.firstName) profileData.firstName = data.firstName;
      if (data.lastName) profileData.lastName = data.lastName;
      if (data.phone) profileData.phone = data.phone;
      if (data.address) profileData.address = data.address;
      if (data.city) profileData.city = data.city;

      profileData.updatedAt = new Date();

      await tx.userProfile.update({
        where: { userId: id },
        data: profileData,
      });

      // 3. Actualizar rol si se solicita
      if (data.role) {
        let role = await tx.role.findUnique({
          where: { name: data.role },
        });

        if (!role) {
          role = await tx.role.create({
            data: {
              name: data.role,
              description: `Rol de tipo ${data.role}`,
              createdAt: new Date(),
            },
          });
        }

        // Eliminar relaciones de rol anteriores (borrado físico o lógico para simplificar)
        await tx.userRole.deleteMany({
          where: { userId: id },
        });

        // Crear nueva relación
        await tx.userRole.create({
          data: {
            userId: id,
            roleId: role.id,
            assignedAt: new Date(),
            status: "ACTIVE",
          },
        });
      }

      return {
        id: user.id,
        email: user.email,
      };
    });
  }

  async deleteUser(id: string): Promise<boolean> {
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    return true;
  }
}
