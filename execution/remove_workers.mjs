import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, businessId: true },
  });

  console.log("Current Users in DB:");
  console.table(users);

  const workers = users.filter((u) => u.role !== "OWNER");
  console.log(`\nFound ${workers.length} non-owner / worker user(s).`);

  const invitations = await prisma.workerInvitation.findMany();
  console.log(`Found ${invitations.length} worker invitation(s).`);

  if (!CONFIRM) {
    console.log("\nDRY RUN: Run with --confirm to delete all workers and worker invitations.");
    return;
  }

  // Delete worker invitations
  const delInvites = await prisma.workerInvitation.deleteMany({});
  console.log(`Deleted ${delInvites.count} worker invitation(s).`);

  // Delete worker sessions
  const workerIds = workers.map((w) => w.id);
  if (workerIds.length > 0) {
    const delSessions = await prisma.session.deleteMany({
      where: { userId: { in: workerIds } },
    });
    console.log(`Deleted ${delSessions.count} session(s) belonging to workers.`);

    // Delete push subscriptions if any
    const delPush = await prisma.pushSubscription.deleteMany({
      where: { userId: { in: workerIds } },
    });
    console.log(`Deleted ${delPush.count} push subscription(s) belonging to workers.`);

    // Delete workers
    const delWorkers = await prisma.user.deleteMany({
      where: { id: { in: workerIds } },
    });
    console.log(`Deleted ${delWorkers.count} worker user(s).`);
  }

  const remaining = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });
  console.log("\nRemaining Admin/Owner Users:");
  console.table(remaining);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
