import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean up existing data
  await prisma.message.deleteMany();
  await prisma.threadParticipant.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.view.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.employer.deleteMany();
  await prisma.emailToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing data');

  // Create demo employer
  const employerPassword = await bcrypt.hash('employer123', 10);
  const employer = await prisma.user.create({
    data: {
      email: 'hiring@acmecorp.com',
      passwordHash: employerPassword,
      role: 'EMPLOYER',
      emailVerified: new Date(),
      employer: {
        create: {
          companyName: 'Acme Corporation',
          website: 'https://acmecorp.com',
          description: 'Leading technology company focused on innovation and growth.',
          hiringRoles: ['Software Engineer', 'Product Manager', 'Data Scientist'],
        },
      },
    },
    include: {
      employer: true,
    },
  });

  console.log('🏢 Created demo employer:', employer.email);

  // Create demo job seekers
  const seeker1Password = await bcrypt.hash('seeker123', 10);
  const seeker1 = await prisma.user.create({
    data: {
      email: 'john.doe@email.com',
      passwordHash: seeker1Password,
      role: 'JOB_SEEKER',
      emailVerified: new Date(),
      profile: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
          headline: 'Full Stack Developer',
          bio: 'Passionate developer with experience in React, Node.js, and cloud technologies.',
          school: 'Stanford University',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          interests: ['Web Development', 'Machine Learning', 'Open Source'],
          skills: ['React', 'Node.js', 'Python', 'AWS', 'Docker'],
          languages: ['English', 'Spanish'],
          workModes: ['HYBRID', 'REMOTE'],
          workAuth: ['US Citizen'],
          openToOpp: true,
        },
      },
    },
    include: {
      profile: true,
    },
  });

  const seeker2Password = await bcrypt.hash('seeker123', 10);
  const seeker2 = await prisma.user.create({
    data: {
      email: 'sarah.smith@email.com',
      passwordHash: seeker2Password,
      role: 'JOB_SEEKER',
      emailVerified: new Date(),
      profile: {
        create: {
          firstName: 'Sarah',
          lastName: 'Smith',
          headline: 'Product Manager',
          bio: 'Experienced product manager with a track record of launching successful products.',
          school: 'UC Berkeley',
          city: 'Oakland',
          state: 'CA',
          country: 'USA',
          interests: ['Product Strategy', 'User Research', 'Data Analytics'],
          skills: ['Product Management', 'SQL', 'Figma', 'Agile', 'A/B Testing'],
          languages: ['English', 'French'],
          workModes: ['ONSITE', 'HYBRID'],
          workAuth: ['US Citizen'],
          openToOpp: true,
        },
      },
    },
    include: {
      profile: true,
    },
  });

  console.log('👥 Created demo job seekers:', seeker1.email, seeker2.email);

  // Create a demo thread and message
  const thread = await prisma.thread.create({
    data: {
      participants: {
        create: [
          { userId: employer.id },
          { userId: seeker1.id },
        ],
      },
      messages: {
        create: [
          {
            senderId: employer.id,
            body: 'Hi John! We were impressed by your profile and would love to discuss potential opportunities at Acme Corp.',
          },
          {
            senderId: seeker1.id,
            body: 'Thank you for reaching out! I would be very interested in learning more about the role and company.',
          },
        ],
      },
    },
  });

  console.log('💬 Created demo conversation thread');

  // Create some profile views
  if (employer.employer && seeker1.profile && seeker2.profile) {
    await prisma.view.createMany({
      data: [
        {
          employerId: employer.employer.id,
          profileId: seeker1.profile.id,
        },
        {
          employerId: employer.employer.id,
          profileId: seeker2.profile.id,
        },
      ],
    });

    console.log('👀 Created demo profile views');
  }

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📧 Demo Accounts:');
  console.log('Employer: hiring@acmecorp.com / employer123');
  console.log('Job Seeker 1: john.doe@email.com / seeker123');
  console.log('Job Seeker 2: sarah.smith@email.com / seeker123');
  console.log('\n🔗 You can now log in and test the application!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
