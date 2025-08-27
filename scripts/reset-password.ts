// scripts/reset-password.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Set the email you want to fix and the new password you want.
 * After running, you can log in with these credentials.
 */
const EMAIL = "johnrothwellmartin3@gmail.com";
const NEW_PASSWORD = "HireMe123!";

async function main() {
  const email = EMAIL.toLowerCase();
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hash,
      emailVerified: new Date(),
      updatedAt: new Date(),
    },
    create: {
      email,
      passwordHash: hash,
      role: "JOB_SEEKER",
      emailVerified: new Date(),
    },
  });

  console.log("User ready:", {
    email: user.email,
    role: user.role,
    verified: user.emailVerified,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
