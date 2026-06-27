import { prisma } from "./shared/config/database";

async function main() {
  console.log("--- Users ---");
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });
  console.log(JSON.stringify(users, null, 2));

  console.log("--- Couriers ---");
  const couriers = await prisma.courier.findMany({
    include: {
      profile: true
    }
  });
  console.log(JSON.stringify(couriers, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
