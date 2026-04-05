import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Roles ───
  const roles = await Promise.all(
    [
      { name: "ADMIN", description: "Administrador del sistema" },
      { name: "RESTAURANT", description: "Dueño de restaurante" },
      { name: "RIDER", description: "Repartidor / domiciliario" },
      { name: "SUPPORT", description: "Agente de soporte" },
    ].map((r) =>
      prisma.role.upsert({
        where: { name: r.name },
        update: {},
        create: {
          name: r.name,
          description: r.description,
          createdAt: new Date(),
        },
      }),
    ),
  );
  console.log(`  ✔ ${roles.length} roles`);

  // ─── Permissions ───
  const permissionDefs = [
    { name: "users:read", resource: "users", action: "read" },
    { name: "users:write", resource: "users", action: "write" },
    { name: "users:delete", resource: "users", action: "delete" },
    { name: "orders:read", resource: "orders", action: "read" },
    { name: "orders:write", resource: "orders", action: "write" },
    { name: "orders:delete", resource: "orders", action: "delete" },
    { name: "restaurants:read", resource: "restaurants", action: "read" },
    { name: "restaurants:write", resource: "restaurants", action: "write" },
    { name: "riders:read", resource: "riders", action: "read" },
    { name: "riders:write", resource: "riders", action: "write" },
    { name: "payments:read", resource: "payments", action: "read" },
    { name: "payments:write", resource: "payments", action: "write" },
    { name: "reports:read", resource: "reports", action: "read" },
    { name: "settings:read", resource: "settings", action: "read" },
    { name: "settings:write", resource: "settings", action: "write" },
    { name: "support:read", resource: "support", action: "read" },
    { name: "support:write", resource: "support", action: "write" },
    { name: "dashboard:read", resource: "dashboard", action: "read" },
    { name: "tracking:read", resource: "tracking", action: "read" },
    { name: "tariffs:read", resource: "tariffs", action: "read" },
    { name: "tariffs:write", resource: "tariffs", action: "write" },
  ];
  const permissions = await Promise.all(
    permissionDefs.map((p) =>
      prisma.permission.upsert({
        where: { name: p.name },
        update: {},
        create: { ...p, createdAt: new Date() },
      }),
    ),
  );
  console.log(`  ✔ ${permissions.length} permissions`);

  // ─── Admin gets all permissions ───
  const adminRole = roles.find((r) => r.name === "ADMIN")!;
  for (const perm of permissions) {
    const exists = await prisma.rolePermission.findFirst({
      where: { roleId: adminRole.id, permissionId: perm.id },
    });
    if (!exists) {
      await prisma.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: perm.id,
          assignedAt: new Date(),
        },
      });
    }
  }
  console.log(`  ✔ Admin role → all permissions`);

  // ─── Admin user ───
  const adminEmail = "jarg.contacto@gmail.com";
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!adminUser) {
    const passwordHash = await bcrypt.hash("Admin123!", 10);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        status: "ACTIVE",
        emailVerified: true,
        createdAt: new Date(),
      },
    });
    await prisma.userProfile.create({
      data: {
        userId: adminUser.id,
        firstName: "Admin",
        lastName: "DeliveryGO",
        documentType: "CC",
        documentNumberEncrypted: Buffer.from("0000000000"),
        documentNumberHash: "0".repeat(64),
        createdAt: new Date(),
      },
    });
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
        assignedAt: new Date(),
      },
    });
    console.log(`  ✔ Admin user created: ${adminEmail} / Admin123!`);
  } else {
    console.log(`  ✔ Admin user already exists`);
  }

  // ─── Order statuses ───
  const orderStatuses = [
    { name: "PENDING", description: "Orden pendiente de confirmación" },
    { name: "CONFIRMED", description: "Orden confirmada por el restaurante" },
    { name: "PREPARING", description: "Orden en preparación" },
    { name: "READY", description: "Orden lista para recoger" },
    { name: "PICKED_UP", description: "Orden recogida por el repartidor" },
    { name: "IN_TRANSIT", description: "Orden en camino" },
    { name: "DELIVERED", description: "Orden entregada" },
    { name: "CANCELLED", description: "Orden cancelada" },
  ];
  for (const s of orderStatuses) {
    const exists = await prisma.orderStatus.findFirst({
      where: { name: s.name },
    });
    if (!exists) {
      await prisma.orderStatus.create({ data: s });
    }
  }
  console.log(`  ✔ ${orderStatuses.length} order statuses`);

  // ─── Delivery statuses ───
  const deliveryStatuses = [
    { name: "ASSIGNED", description: "Asignada a un Repartidor" },
    {
      name: "HEADING_TO_RESTAURANT",
      description: "Repartidor en camino al restaurante",
    },
    { name: "AT_RESTAURANT", description: "Repartidor en el restaurante" },
    { name: "PICKED_UP", description: "Paquete recogido" },
    { name: "IN_TRANSIT", description: "En tránsito al destino" },
    { name: "ARRIVED", description: "Repartidor llegó al destino" },
    { name: "DELIVERED", description: "Entrega completada" },
    { name: "FAILED", description: "Entrega fallida" },
    { name: "RETURNED", description: "Paquete devuelto" },
  ];
  for (const s of deliveryStatuses) {
    const exists = await prisma.deliveryStatus.findFirst({
      where: { name: s.name },
    });
    if (!exists) {
      await prisma.deliveryStatus.create({ data: s });
    }
  }
  console.log(`  ✔ ${deliveryStatuses.length} delivery statuses`);

  // ─── Restaurant statuses ───
  const restaurantStatuses = [
    { name: "ACTIVE", description: "Restaurante activo y operando" },
    { name: "INACTIVE", description: "Restaurante temporalmente inactivo" },
    { name: "PENDING_APPROVAL", description: "Pendiente de aprobación" },
    { name: "SUSPENDED", description: "Restaurante suspendido" },
  ];
  for (const s of restaurantStatuses) {
    const exists = await prisma.restaurantStatus.findFirst({
      where: { name: s.name },
    });
    if (!exists) {
      await prisma.restaurantStatus.create({ data: s });
    }
  }
  console.log(`  ✔ ${restaurantStatuses.length} restaurant statuses`);

  // ─── Order priorities ───
  const priorities = [
    { name: "LOW", level: 1, description: "Prioridad baja" },
    { name: "NORMAL", level: 2, description: "Prioridad normal" },
    { name: "HIGH", level: 3, description: "Prioridad alta" },
    { name: "URGENT", level: 4, description: "Prioridad urgente" },
  ];
  for (const p of priorities) {
    const exists = await prisma.orderPriority.findFirst({
      where: { name: p.name },
    });
    if (!exists) {
      await prisma.orderPriority.create({ data: p });
    }
  }
  console.log(`  ✔ ${priorities.length} order priorities`);

  // ─── Payment methods ───
  const methods = [
    { code: "CASH", name: "Efectivo", methodType: "CASH" as const },
    {
      code: "CARD",
      name: "Tarjeta de crédito/débito",
      methodType: "CARD" as const,
      requiresGateway: true,
    },
    {
      code: "BANK_TRANSFER",
      name: "Transferencia bancaria",
      methodType: "BANK_TRANSFER" as const,
    },
    {
      code: "NEQUI",
      name: "Nequi",
      methodType: "ONLINE_GATEWAY" as const,
      requiresGateway: true,
    },
    {
      code: "DAVIPLATA",
      name: "Daviplata",
      methodType: "ONLINE_GATEWAY" as const,
      requiresGateway: true,
    },
  ];
  for (const m of methods) {
    await prisma.paymentMethod.upsert({
      where: { code: m.code },
      update: {},
      create: { ...m, createdAt: new Date() },
    });
  }
  console.log(`  ✔ ${methods.length} payment methods`);

  // ─── Notification channels ───
  const channels = [
    { code: "EMAIL", name: "Correo electrónico" },
    { code: "SMS", name: "Mensaje de texto" },
    { code: "PUSH", name: "Notificación push" },
    { code: "IN_APP", name: "Notificación en la app" },
  ];
  for (const c of channels) {
    await prisma.notificationChannel.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log(`  ✔ ${channels.length} notification channels`);

  // ─── Invoice types ───
  const invoiceTypes = [
    { code: "DELIVERY_FEE", name: "Tarifa de entrega" },
    { code: "SERVICE_FEE", name: "Tarifa de servicio" },
    { code: "SUBSCRIPTION", name: "Suscripción" },
  ];
  for (const t of invoiceTypes) {
    await prisma.invoiceType.upsert({
      where: { code: t.code },
      update: {},
      create: { ...t, createdAt: new Date() },
    });
  }
  console.log(`  ✔ ${invoiceTypes.length} invoice types`);

  console.log("\n✅ Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
