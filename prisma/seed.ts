import { PrismaClient, Role, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertPlans() {
  await prisma.plan.upsert({
    where: { code: 'FREE' },
    create: { code: 'FREE', name: 'Free', priceCents: 0, invitesPerMonth: 10, searchesPerDay: 25, seats: 1 },
    update: {},
  });
  await prisma.plan.upsert({
    where: { code: 'STARTER' },
    create: { code: 'STARTER', name: 'Starter', priceCents: 9900, invitesPerMonth: 100, searchesPerDay: 200, seats: 3 },
    update: {},
  });
  await prisma.plan.upsert({
    where: { code: 'PRO' },
    create: { code: 'PRO', name: 'Pro', priceCents: 24900, invitesPerMonth: 500, searchesPerDay: 1000, seats: 10 },
    update: {},
  });
}

async function ensureDemoUsers() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Employer
  let employerUser = await prisma.user.findUnique({ where: { email: 'seed+employer@hireme.local' } });
  if (!employerUser) {
    employerUser = await prisma.user.create({
      data: {
        email: 'seed+employer@hireme.local',
        passwordHash,
        role: Role.EMPLOYER,
        emailVerified: new Date(),
      },
    });
  }
  let employer = await prisma.employer.findUnique({ where: { userId: employerUser.id } });
  if (!employer) {
    employer = await prisma.employer.create({
      data: {
        userId: employerUser.id,
        companyName: 'Acme Co.',
        website: 'https://example.com',
        industry: 'Software',
        about: 'Demo employer for local dev.',
        locationCity: 'Charlottesville',
        locationState: 'VA',
      },
    });
  }

  // Candidate
  let seekerUser = await prisma.user.findUnique({ where: { email: 'seed+seeker@hireme.local' } });
  if (!seekerUser) {
    seekerUser = await prisma.user.create({
      data: {
        email: 'seed+seeker@hireme.local',
        passwordHash,
        role: Role.JOB_SEEKER,
        emailVerified: new Date(),
      },
    });
  }
  let profile = await prisma.profile.findUnique({ where: { userId: seekerUser.id } });
  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId: seekerUser.id,
        firstName: 'Sam',
        lastName: 'Student',
        headline: 'CS @ UVA — SWE Intern',
        bio: 'Early-career engineer interested in backend and infra.',
        skills: ['JavaScript', 'TypeScript', 'React', 'Node', 'SQL'],
        locationCity: 'Charlottesville',
        locationState: 'VA',
        locationCountry: 'USA',
      },
    });
  }

  // Candidate preferences
  await prisma.candidatePreference.upsert({
    where: { profileId: profile.id },
    create: {
      profileId: profile.id,
      desiredLocations: ['Washington DC', 'Richmond, VA'],
      desiredRoles: ['Software Engineer', 'Backend Engineer'],
      workModes: ['ONSITE', 'HYBRID'],
      workAuth: ['US_CITIZEN'],
      minSalary: 70000,
      openToOpportunities: true,
    },
    update: {},
  });

  // Employer on FREE plan (subscription)
  const freePlan = await prisma.plan.findUnique({ where: { code: 'FREE' } });
  if (freePlan) {
    const existingSub = await prisma.subscription.findFirst({
      where: { employerId: employer.id, planId: freePlan.id },
    });
    if (!existingSub) {
      await prisma.subscription.create({
        data: {
          employerId: employer.id,
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
}

async function main() {
  console.log('Seeding: plans, demo users, profile, preferences…');
  await upsertPlans();
  await ensureDemoUsers();
  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
