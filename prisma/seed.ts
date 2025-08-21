/*
 * Seed script for the HireMe application. Run this using
 * `npm run seed` after running `npx prisma migrate dev`. This script
 * populates the database with a handful of employers, jobs and job
 * seekers to make development and testing more enjoyable. Passwords
 * for seeded users are set to "password". All seeded users have
 * verified emails for convenience.
 */
import { PrismaClient, Role, EmploymentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Sample data for generating users and jobs
const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah', 'Ian', 'Julia'];
const lastNames = ['Smith', 'Johnson', 'Brown', 'Williams', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson'];
const skills = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'SQL', 'AWS', 'Docker'];
const companyNames = [
  'Acme Corp',
  'Globex Inc',
  'Umbrella Solutions',
  'Initech',
  'Hooli',
  'Stark Industries',
  'Wayne Enterprises',
  'Wonka Industries',
  'Soylent Corp',
  'Gekko & Co',
];
const jobTitles = [
  'Software Engineer',
  'Data Analyst',
  'Product Manager',
  'DevOps Engineer',
  'Marketing Coordinator',
  'Sales Associate',
  'UX Designer',
  'Quality Assurance Tester',
  'Database Administrator',
  'Project Manager',
  'Systems Engineer',
  'Technical Writer',
  'Customer Success Manager',
  'Business Analyst',
  'Front End Developer',
  'Back End Developer',
  'Full Stack Developer',
  'Mobile Developer',
  'Cloud Architect',
  'Security Engineer',
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSkills(): string[] {
  const count = Math.floor(Math.random() * 5) + 1;
  const set = new Set<string>();
  while (set.size < count) {
    set.add(randomElement(skills));
  }
  return Array.from(set);
}

async function main() {
  console.log('Seeding database...');
  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.job.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.employer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.emailToken.deleteMany();

  // Pre-hash the password
  const passwordHash = await bcrypt.hash('password', 10);

  // Create employers and their jobs
  for (let i = 0; i < 10; i++) {
    const email = `employer${i + 1}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.EMPLOYER,
        emailVerified: new Date(),
      },
    });
    const employer = await prisma.employer.create({
      data: {
        userId: user.id,
        companyName: companyNames[i % companyNames.length],
        industry: 'Technology',
        about: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        locationCity: 'Anytown',
        locationState: 'VA',
      },
    });
    // Create three jobs for each employer
    for (let j = 0; j < 3; j++) {
      const title = randomElement(jobTitles);
      await prisma.job.create({
        data: {
          employerId: employer.id,
          title,
          description: `This is a description for the ${title} position at ${employer.companyName}.`,
          locationCity: 'Anytown',
          locationState: 'VA',
          employment: EmploymentType.FULL_TIME,
          salaryMin: 60000,
          salaryMax: 120000,
          tags: randomSkills(),
        },
      });
    }
  }
  // Create job seekers
  for (let i = 0; i < 100; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.JOB_SEEKER,
        emailVerified: new Date(),
      },
    });
    await prisma.profile.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        school: 'University of Example',
        age: 20 + (i % 10),
        headline: `${randomElement(jobTitles)} enthusiast`,
        skills: randomSkills(),
        resumeUrl: null,
        videoUrl: null,
        locationCity: 'Anytown',
        locationState: 'VA',
        seeking: randomElement(jobTitles),
        visibility: true,
      },
    });
  }
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });