import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import { PrismaClient } from 'src/generated/prisma/client';
import 'dotenv/config'
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Seeding database...');

  const user1 = await prisma.user.create({
    data: {
      email: 'admin@crm.com',
      name: 'Admin User',
      password: 'password1',

      otpCode: "",
      otpExpiry: null,
      isVerified: false,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user@crm.com',
      name: 'Normal User',
      password: 'password2',
      otpCode: "",
      otpExpiry: null,
      isVerified: false,


    },
  });

  await prisma.post.createMany({
    data: [
      {
        title: 'First Post',
        content: 'Hello from Admin',
        published: true,
        authorId: user1.id,
      },
      {
        title: 'Draft Post',
        content: 'Work in progress',
        published: false,
        authorId: user1.id,
      },
      {
        title: 'User Post',
        content: 'Posted by normal user',
        published: true,
        authorId: user2.id,
      },
    ],
  });

  console.log('✅ Seeding completed');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
