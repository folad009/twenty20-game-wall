import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPhone = (process.env.ADMIN_PHONE ?? "").replace(/\s/g, "");

  // Remove all submitted content first.
  await prisma.question.deleteMany({});

  // Keep all role=admin users. Also keep ADMIN_PHONE as extra safety.
  const keepWhere = adminPhone
    ? { OR: [{ role: "admin" }, { phone: adminPhone }] }
    : { role: "admin" };

  const deletedUsers = await prisma.user.deleteMany({
    where: {
      NOT: keepWhere,
    },
  });

  const admins = await prisma.user.findMany({
    where: keepWhere,
    select: { id: true, name: true, phone: true, role: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("Reset complete.");
  console.log("Deleted users:", deletedUsers.count);
  console.log("Admins kept:", admins.length);
  admins.forEach((a) => {
    console.log(`- ${a.name} (${a.phone}) role=${a.role}`);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
