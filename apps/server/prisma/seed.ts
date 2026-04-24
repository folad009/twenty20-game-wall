import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPhone = process.env.ADMIN_PHONE ?? "+15550000001";
  const adminName = process.env.ADMIN_NAME ?? "Demo Admin";

  await prisma.user.upsert({
    where: { phone: adminPhone },
    create: {
      name: adminName,
      phone: adminPhone,
      role: "admin",
    },
    update: { name: adminName, role: "admin" },
  });

  const demoUser = await prisma.user.upsert({
    where: { phone: "+15550009999" },
    create: { name: "Demo Attendee", phone: "+15550009999", role: "user" },
    update: {},
  });

  const existing = await prisma.question.count();
  if (existing === 0) {
    await prisma.question.createMany({
      data: [
        {
          content: "What time does the keynote start?",
          answer: "Main hall at 9:00 AM.",
          status: "answered",
          userId: demoUser.id,
        },
        {
          content: "Where is the coffee station?",
          status: "pending",
          userId: demoUser.id,
        },
      ],
    });
  }

  console.log("Seed complete. Admin phone:", adminPhone);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
